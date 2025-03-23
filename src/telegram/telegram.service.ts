import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { v4 as uuidv4 } from 'uuid';

interface EmailNotificationParams {
  chatId: number;
  emailAccountId: number;
  messageId: string;
  from: string;
  subject: string;
  date: string;
}

interface EmailAddToken {
  token: string;
  chatId: number;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
}

interface PasswordResetToken {
  token: string;
  emailAccountId: number;
  chatId: number;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private emailAddTokens: Map<string, EmailAddToken> = new Map();
  private passwordResetTokens: Map<string, PasswordResetToken> = new Map();
  private TOKEN_EXPIRY_MINUTES = 30;

  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async sendEmailNotification(params: EmailNotificationParams): Promise<void> {
    const { chatId, emailAccountId, messageId, from, subject, date } = params;

    try {
      // Create a message with inline keyboard buttons for actions
      const message =
        `📬 *New Email*\n\n` +
        `*From:* ${this.escapeMarkdown(from)}\n` +
        `*Subject:* ${this.escapeMarkdown(subject)}\n` +
        `*Date:* ${this.escapeMarkdown(date)}`;

      // Create inline keyboard with actions
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Mark as Read',
            `read:${emailAccountId}:${messageId}`,
          ),
          Markup.button.callback(
            '🚫 Mark as Spam',
            `spam:${emailAccountId}:${messageId}`,
          ),
        ],
      ]);

      // Send the message
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'MarkdownV2',
        ...keyboard,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email notification to chat ${chatId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendSuccessMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, `✅ ${message}`);
    } catch (error) {
      this.logger.error(
        `Failed to send success message to chat ${chatId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendErrorMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, `❌ ${message}`);
    } catch (error) {
      this.logger.error(
        `Failed to send error message to chat ${chatId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async generateAddEmailToken(chatId: number, userId: number): Promise<string> {
    // Clean expired tokens
    this.cleanExpiredTokens();

    // Generate a new UUID token
    const token = uuidv4();

    // Set expiration time (30 minutes from now)
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    // Store token with chat ID and expiration
    this.emailAddTokens.set(token, {
      token,
      chatId,
      userId,
      createdAt: now,
      expiresAt,
    });

    this.logger.log(
      `Generated add email token for chat ${chatId}, expires at ${expiresAt}`,
    );

    return token;
  }

  async generatePasswordResetToken(
    emailAccountId: number,
    chatId: number,
    userId: number,
  ): Promise<string> {
    // Clean expired tokens
    this.cleanExpiredPasswordResetTokens();

    // Generate a new UUID token
    const token = uuidv4();

    // Set expiration time (30 minutes from now)
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    // Store token with email account ID, chat ID and expiration
    this.passwordResetTokens.set(token, {
      token,
      emailAccountId,
      chatId,
      userId,
      createdAt: now,
      expiresAt,
    });

    this.logger.log(
      `Generated password reset token for email account ${emailAccountId}, chat ${chatId}, expires at ${expiresAt}`,
    );

    return token;
  }

  getTokenData(token: string): EmailAddToken | null {
    // Check if token exists and is valid
    const tokenData = this.emailAddTokens.get(token);

    if (!tokenData) {
      return null;
    }

    // Check if token has expired
    if (new Date() > tokenData.expiresAt) {
      this.emailAddTokens.delete(token);
      return null;
    }

    return tokenData;
  }

  getPasswordResetTokenData(token: string): PasswordResetToken | null {
    // Check if token exists and is valid
    const tokenData = this.passwordResetTokens.get(token);

    if (!tokenData) {
      return null;
    }

    // Check if token has expired
    if (new Date() > tokenData.expiresAt) {
      this.passwordResetTokens.delete(token);
      return null;
    }

    return tokenData;
  }

  invalidateToken(token: string): void {
    this.emailAddTokens.delete(token);
  }

  invalidatePasswordResetToken(token: string): void {
    this.passwordResetTokens.delete(token);
  }

  private cleanExpiredTokens(): void {
    const now = new Date();

    for (const [token, data] of this.emailAddTokens.entries()) {
      if (now > data.expiresAt) {
        this.emailAddTokens.delete(token);
      }
    }
  }

  private cleanExpiredPasswordResetTokens(): void {
    const now = new Date();

    for (const [token, data] of this.passwordResetTokens.entries()) {
      if (now > data.expiresAt) {
        this.passwordResetTokens.delete(token);
      }
    }
  }

  // Helper method to escape markdown characters for Telegram's MarkdownV2 format
  escapeMarkdown(text: string): string {
    return text
      .replace(/\_/g, '\\_')
      .replace(/\*/g, '\\*')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\~/g, '\\~')
      .replace(/\`/g, '\\`')
      .replace(/\>/g, '\\>')
      .replace(/\#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/\-/g, '\\-')
      .replace(/\=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/\!/g, '\\!');
  }
}
