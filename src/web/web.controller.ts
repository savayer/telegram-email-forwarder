import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { TelegramService } from '../telegram/telegram.service';
import { EmailAccountService } from '../email-account/email-account.service';
import { ImapService } from '../imap/imap.service';
import { ResetPasswordDto } from '../telegram/dto/reset-password.dto';

interface AddEmailDto {
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  useTls: boolean;
  spamFolder: string;
  token: string;
}

interface TokenCheckDto {
  isValid: boolean;
  message?: string;
  emailAccount?: {
    id: number;
    email: string;
  };
}

@Controller('api/email')
export class WebController {
  private readonly logger = new Logger(WebController.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly emailAccountService: EmailAccountService,
    private readonly imapService: ImapService,
  ) {}

  // Serve the email setup HTML page
  @Get('setup')
  setupPage(@Res() res: Response) {
    return res.sendFile('email-setup.html', { root: 'public' });
  }

  // Serve the email add page with token
  @Get('add')
  addEmailPage(@Res() res: Response) {
    return res.sendFile('email-setup.html', { root: 'public' });
  }

  // Serve the password reset HTML page
  @Get('reset-password-page')
  resetPasswordPage(@Res() res: Response) {
    return res.sendFile('reset-password.html', { root: 'public' });
  }

  // Serve the password reset page with token
  @Get('reset-password')
  resetPasswordWithTokenPage(@Res() res: Response) {
    return res.sendFile('reset-password.html', { root: 'public' });
  }

  // Validate token endpoint for email add
  @Get('validate-token')
  validateToken(@Query('token') token: string): TokenCheckDto {
    if (!token) {
      return { isValid: false, message: 'Token is missing' };
    }

    const tokenData = this.telegramService.getTokenData(token);
    if (!tokenData) {
      return { isValid: false, message: 'Token is expired or invalid' };
    }

    return { isValid: true };
  }

  // Validate token endpoint for password reset
  @Get('validate-reset-token')
  async validateResetToken(
    @Query('token') token: string,
  ): Promise<TokenCheckDto> {
    if (!token) {
      return { isValid: false, message: 'Token is missing' };
    }

    const tokenData = this.telegramService.getPasswordResetTokenData(token);
    if (!tokenData) {
      return { isValid: false, message: 'Token is expired or invalid' };
    }

    try {
      const account = await this.emailAccountService.findOne(
        tokenData.emailAccountId,
      );
      if (!account) {
        return { isValid: false, message: 'Email account not found' };
      }

      return {
        isValid: true,
        emailAccount: {
          id: account.id,
          email: account.email,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error validating reset token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { isValid: false, message: 'Error validating token' };
    }
  }

  // Reset password endpoint
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, newPassword } = resetPasswordDto;

      // Validate token
      const tokenData = this.telegramService.getPasswordResetTokenData(token);
      if (!tokenData) {
        throw new HttpException(
          'Token expired or invalid',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract email account ID
      const { emailAccountId, chatId } = tokenData;

      // Update password
      const account = await this.emailAccountService.updatePassword(
        emailAccountId,
        newPassword,
      );

      if (!account) {
        throw new HttpException(
          'Email account not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Test connection with new password
      try {
        await this.imapService.connectAccount(account.id);

        // Connection successful, invalidate the token
        this.telegramService.invalidatePasswordResetToken(token);

        // Send success message to Telegram
        await this.telegramService.sendSuccessMessage(
          chatId,
          `Password for ${account.email} has been successfully updated!`,
        );

        // Return success response
        return {
          success: true,
          message: 'Your email account password has been successfully updated!',
        };
      } catch (error) {
        this.logger.error(
          `Connection test failed with new password: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Send error message to Telegram
        await this.telegramService.sendErrorMessage(
          chatId,
          `Failed to connect to your email account with the new password. Please check your settings and try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Return error response
        throw new HttpException(
          `Failed to connect with new password: ${error instanceof Error ? error.message : 'Unknown error'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error resetting password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // If it's already an HttpException, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // Otherwise, wrap it in an HttpException
      throw new HttpException(
        'An error occurred while updating your email account password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Add email account endpoint
  @Post('add')
  async addEmail(@Body() addEmailDto: AddEmailDto) {
    try {
      const { token, email, password, imapHost, imapPort, useTls, spamFolder } =
        addEmailDto;

      // Validate token
      const tokenData = this.telegramService.getTokenData(token);
      if (!tokenData) {
        throw new HttpException(
          'Token expired or invalid',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract chat ID and user ID from token
      const { chatId, userId } = tokenData;

      // Create the email account entity
      const emailAccount = {
        userId,
        chatId,
        email,
        password,
        imapHost,
        imapPort,
        useTls,
        isActive: true,
      };

      // Save account to database
      const account = await this.emailAccountService.create(emailAccount);

      // Test connection
      try {
        await this.imapService.connectAccount(account.id);

        // Connection successful, invalidate the token
        this.telegramService.invalidateToken(token);

        // Send success message to Telegram
        await this.telegramService.sendSuccessMessage(
          chatId,
          `Email account ${email} has been successfully connected!`,
        );

        // Return success response
        return {
          success: true,
          message: 'Your email account has been successfully added!',
        };
      } catch (error) {
        // Connection failed, remove the account
        await this.emailAccountService.remove(account.id);

        this.logger.error(
          `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Send error message to Telegram
        await this.telegramService.sendErrorMessage(
          chatId,
          `Failed to connect to your email account. Please check your settings and try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Return error response
        throw new HttpException(
          `Failed to connect to your email account: ${error instanceof Error ? error.message : 'Unknown error'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error adding email account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // If it's already an HttpException, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // Otherwise, wrap it in an HttpException
      throw new HttpException(
        'An error occurred while saving your email account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
