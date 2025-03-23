import { Injectable, Logger } from '@nestjs/common';
import {
  Action,
  Command,
  Ctx,
  On,
  Scene,
  SceneEnter,
  SceneLeave,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { Context, NarrowedContext } from 'telegraf';
import {
  CallbackQuery,
  Message,
  Update as TelegramUpdate,
} from 'telegraf/typings/core/types/typegram';
import { EmailAccountService } from '../email-account/email-account.service';
import { TelegramService } from './telegram.service';
import { ImapService } from '../imap/imap.service';

// Define custom context type with all required properties
type TelegrafContext = Context & {
  scene: Scenes.SceneContextScene<any>;
  session: any;
  match?: RegExpExecArray;
};

// Define scenes for multi-step conversations
export const ADD_EMAIL_SCENE = 'add_email_scene';

@Update()
@Injectable()
export class TelegramBotController {
  private readonly logger = new Logger(TelegramBotController.name);

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly telegramService: TelegramService,
    private readonly imapService: ImapService,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  @Start()
  async start(@Ctx() ctx: TelegrafContext) {
    await ctx.reply(
      '👋 Welcome to Email Forwarder Bot!\n\n' +
        'Use /addemail to set up a new email account for forwarding\n' +
        'Use /myemails to list your connected email accounts\n' +
        'Use /help for more information',
      Markup.keyboard([['/addemail', '/myemails'], ['/help']]).resize(),
    );
  }

  @Command('help')
  async help(@Ctx() ctx: TelegrafContext) {
    await ctx.reply(
      '📩 *Email Forwarder Bot Help*\n\n' +
        'This bot forwards your emails to Telegram and allows you to manage them\\.\n\n' +
        '*Commands:*\n' +
        '/start \\- Start the bot\n' +
        '/addemail \\- Add a new email account\n' +
        '/myemails \\- List your connected email accounts\n' +
        '/remove\\_email \\- Remove an email account\n' +
        '/reset\\_password \\- Reset password for an email account\n' +
        '/help \\- Show this help message',
      { parse_mode: 'MarkdownV2' },
    );
  }

  @Command('addemail')
  async addEmail(@Ctx() ctx: TelegrafContext) {
    try {
      const chatId = ctx.chat?.id;
      const userId = ctx.from?.id;

      if (!chatId || !userId) {
        this.logger.error('Chat or user ID missing in context');
        return;
      }

      // Generate UUID token for secure web form access
      const token = await this.telegramService.generateAddEmailToken(
        chatId,
        userId,
      );

      // Create web link
      const webLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/email/add?token=${token}`;

      // Simple text message with the link
      await ctx.reply(
        `📧 Add Email Account\n\n` +
          `To securely add your email account, please use the link below:\n\n${webLink}\n\n` +
          `This link will expire in 30 minutes for security reasons.`,
      );

      /* Код с кнопками для будущего использования
      // Create inline keyboard with the link button
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('📧 Add Email Account', webLink)],
      ]);

      await ctx.reply(
        'To securely add your email account, please use the button below.\n' +
        'This link will expire in 30 minutes for security reasons.',
        { reply_markup: keyboard.reply_markup },
      );
      */
    } catch (error) {
      this.logger.error(
        `Error generating link: ${this.getErrorMessage(error)}`,
      );
      await ctx.reply(
        '❌ An error occurred while generating the link. Please try again later.',
      );
    }
  }

  @Command('myemails')
  async listEmails(@Ctx() ctx: TelegrafContext) {
    const chatId = (ctx as any).chat?.id;
    const userId = (ctx as any).from?.id;

    if (!chatId || !userId) {
      this.logger.error('Chat or user ID missing in context');
      return;
    }

    try {
      const accounts = await this.emailAccountService.findByChatId(chatId);

      if (accounts.length === 0) {
        await ctx.reply(
          'You have no email accounts connected. Use /addemail to add one.',
        );
        return;
      }

      const message = accounts
        .map((account, index) => {
          const status = account.isActive ? '✅ Active' : '❌ Inactive';
          return `${index + 1}. ${account.email} - ${status}`;
        })
        .join('\n');

      await ctx.reply(
        `📬 Your connected email accounts:\n\n${message}\n\nUse /remove_email to remove an account.`,
      );
    } catch (error) {
      this.logger.error(`Error listing emails: ${this.getErrorMessage(error)}`);
      await ctx.reply(
        '❌ An error occurred while fetching your email accounts.',
      );
    }
  }

  @Command('remove_email')
  async removeEmailCommand(@Ctx() ctx: TelegrafContext) {
    if (!ctx.chat?.id) {
      this.logger.error('Chat ID missing in context');
      return;
    }

    const chatId = ctx.chat.id;

    try {
      const accounts = await this.emailAccountService.findByChatId(chatId);

      if (accounts.length === 0) {
        await ctx.reply('You have no email accounts to remove.');
        return;
      }

      const buttons = accounts.map((account) => {
        return [
          Markup.button.callback(`${account.email}`, `remove:${account.id}`),
        ];
      });

      await ctx.reply(
        'Select an email account to remove:',
        Markup.inlineKeyboard(buttons),
      );
    } catch (error) {
      this.logger.error(
        `Error preparing removal: ${this.getErrorMessage(error)}`,
      );
      await ctx.reply('❌ An error occurred while preparing email removal.');
    }
  }

  @Action(/^remove:(\d+)$/)
  async removeEmail(@Ctx() ctx: TelegrafContext) {
    if (!ctx.match || !ctx.chat?.id) {
      this.logger.error('Match or chat ID missing in context');
      return;
    }

    const accountId = ctx.match[1];
    const chatId = ctx.chat.id;

    try {
      const account = await this.emailAccountService.findOne(
        parseInt(accountId),
      );

      if (!account || account.chatId !== chatId) {
        await ctx.editMessageText(
          '❌ Account not found or you do not have permission to remove it.',
        );
        return;
      }

      await this.emailAccountService.remove(parseInt(accountId));
      await ctx.editMessageText(
        `✅ Email account ${account.email} has been removed.`,
      );
    } catch (error) {
      this.logger.error(`Error removing email: ${this.getErrorMessage(error)}`);
      await ctx.editMessageText(
        '❌ An error occurred while removing the email account.',
      );
    }
  }

  @Action(/^read:(\d+):(.+)$/)
  async markAsRead(@Ctx() ctx: TelegrafContext) {
    try {
      if (!ctx.match || !ctx.callbackQuery?.message) {
        this.logger.error('Match or message missing in context');
        return;
      }

      const accountId = parseInt(ctx.match[1]);
      const messageId = ctx.match[2];

      const success = await this.imapService.markAsRead(accountId, messageId);

      if (success) {
        // Получить оригинальный текст без форматирования
        const originalText = (ctx.callbackQuery.message as any).text;

        // Редактируем сообщение без использования Markdown
        await ctx.editMessageText(`${originalText}\n\n✅ Marked as read`);
      } else {
        await ctx.answerCbQuery('Failed to mark message as read');
      }
    } catch (error) {
      this.logger.error(
        `Error marking as read: ${this.getErrorMessage(error)}`,
      );
      await ctx.answerCbQuery('An error occurred');
    }
  }

  @Action(/^spam:(\d+):(.+)$/)
  async markAsSpam(@Ctx() ctx: TelegrafContext) {
    try {
      if (!ctx.match || !ctx.callbackQuery?.message) {
        this.logger.error('Match or message missing in context');
        return;
      }

      const accountId = parseInt(ctx.match[1]);
      const messageId = ctx.match[2];

      const success = await this.imapService.markAsSpam(accountId, messageId);

      if (success) {
        // Получить оригинальный текст без форматирования
        const originalText = (ctx.callbackQuery.message as any).text;

        // Редактируем сообщение без использования Markdown
        await ctx.editMessageText(`${originalText}\n\n🚫 Marked as spam`);
      } else {
        await ctx.answerCbQuery('Failed to mark message as spam');
      }
    } catch (error) {
      this.logger.error(
        `Error marking as spam: ${this.getErrorMessage(error)}`,
      );
      await ctx.answerCbQuery('An error occurred');
    }
  }

  @Command('reset_password')
  async resetPasswordCommand(@Ctx() ctx: TelegrafContext) {
    if (!ctx.chat?.id) {
      this.logger.error('Chat ID missing in context');
      return;
    }

    const chatId = ctx.chat.id;

    try {
      const accounts = await this.emailAccountService.findByChatId(chatId);

      if (accounts.length === 0) {
        await ctx.reply(
          'You have no email accounts to update the password for.',
        );
        return;
      }

      const buttons = accounts.map((account) => {
        return [
          Markup.button.callback(`${account.email}`, `resetpass:${account.id}`),
        ];
      });

      await ctx.reply(
        'Select an email account to reset password:',
        Markup.inlineKeyboard(buttons),
      );
    } catch (error) {
      this.logger.error(
        `Error preparing password reset: ${this.getErrorMessage(error)}`,
      );
      await ctx.reply('❌ An error occurred while preparing password reset.');
    }
  }

  @Action(/^resetpass:(\d+)$/)
  async resetPassword(@Ctx() ctx: TelegrafContext) {
    if (!ctx.match || !ctx.chat?.id || !ctx.from?.id) {
      this.logger.error('Match, chat ID, or user ID missing in context');
      return;
    }

    const accountId = parseInt(ctx.match[1]);
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    try {
      const account = await this.emailAccountService.findOne(accountId);

      if (!account || account.chatId !== chatId) {
        await ctx.editMessageText(
          '❌ Account not found or you do not have permission to reset its password.',
        );
        return;
      }

      // Generate UUID token for secure web form access
      const token = await this.telegramService.generatePasswordResetToken(
        accountId,
        chatId,
        userId,
      );

      // Create web link
      const webLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/email/reset-password?token=${token}`;

      // Simple text message with the link
      await ctx.editMessageText(
        `📧 Reset Password for ${account.email}\n\n` +
          `To reset your password, use this link:\n\n${webLink}\n\n` +
          `This link will expire in 30 minutes for security reasons.`,
      );

      /* Код с кнопками для будущего использования
      // Create inline keyboard with the link button
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('🔑 Reset Password', webLink)],
      ]);

      await ctx.editMessageText(
        `Reset password for account: ${account.email}\n\n` +
        'Use the button below to securely reset your password.\n' +
        'This link will expire in 30 minutes for security reasons.',
        { reply_markup: keyboard.reply_markup },
      );
      */
    } catch (error) {
      this.logger.error(
        `Error generating password reset link: ${this.getErrorMessage(error)}`,
      );
      await ctx.editMessageText(
        '❌ An error occurred while generating the password reset link. Please try again later.',
      );
    }
  }
}

// Add Email Scene
@Scene(ADD_EMAIL_SCENE)
export class AddEmailScene {
  private readonly logger = new Logger(AddEmailScene.name);

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly telegramService: TelegramService,
    private readonly imapService: ImapService,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  @SceneEnter()
  async enter(@Ctx() ctx: TelegrafContext) {
    ctx.session.emailData = {};
    await ctx.reply('Please enter your email address:');
  }

  @On('text')
  async onText(@Ctx() ctx: TelegrafContext) {
    if (!ctx.message || !('text' in ctx.message)) {
      this.logger.error('Message text missing in context');
      return;
    }

    const text = ctx.message.text;

    if (!ctx.session.emailData) {
      ctx.session.emailData = {};
    }

    if (!ctx.session.emailData.email) {
      // Email address step
      if (!this.isValidEmail(text)) {
        await ctx.reply(
          'Invalid email format. Please enter a valid email address:',
        );
        return;
      }

      ctx.session.emailData.email = text;
      await ctx.reply('Please enter your email password:');
      return;
    }

    if (!ctx.session.emailData.password) {
      // Password step
      ctx.session.emailData.password = text;
      await ctx.reply('Please enter your IMAP server (e.g., imap.gmail.com):');
      return;
    }

    if (!ctx.session.emailData.imapHost) {
      // IMAP server step
      ctx.session.emailData.imapHost = text;
      await ctx.reply('Please enter your IMAP port (e.g., 993 for SSL):');
      return;
    }

    if (!ctx.session.emailData.imapPort) {
      // IMAP port step
      const port = parseInt(text);
      if (isNaN(port)) {
        await ctx.reply('Invalid port. Please enter a valid number:');
        return;
      }

      ctx.session.emailData.imapPort = port;
      await ctx.reply(
        'Use TLS/SSL? (recommended for security)',
        Markup.inlineKeyboard([
          Markup.button.callback('Yes', 'tls:yes'),
          Markup.button.callback('No', 'tls:no'),
        ]),
      );
      return;
    }
  }

  @Action('tls:yes')
  async tlsYes(@Ctx() ctx: TelegrafContext) {
    ctx.session.emailData.useTls = true;
    await this.saveAccount(ctx);
  }

  @Action('tls:no')
  async tlsNo(@Ctx() ctx: TelegrafContext) {
    ctx.session.emailData.useTls = false;
    await this.saveAccount(ctx);
  }

  @SceneLeave()
  async leave(@Ctx() ctx: TelegrafContext) {
    await ctx.reply('Exited email setup.');
  }

  private async saveAccount(ctx: TelegrafContext) {
    try {
      if (!ctx.from?.id || !ctx.chat?.id) {
        this.logger.error('User or chat ID missing in context');
        await ctx.reply('Could not identify user or chat. Please try again.');
        await ctx.scene.leave();
        return;
      }

      // For callback query messages
      if (ctx.callbackQuery) {
        await ctx.editMessageText('Setting up your account... Please wait.');
      }

      const { email, password, imapHost, imapPort, useTls } =
        ctx.session.emailData;

      // Save account to database
      const accountData = {
        userId: ctx.from.id,
        chatId: ctx.chat.id,
        email,
        password,
        imapHost,
        imapPort,
        useTls,
        isActive: true,
      };

      const account = await this.emailAccountService.create(accountData);

      // Test connection
      try {
        await this.imapService.connectAccount(account.id);
        await ctx.reply(
          `✅ Email account ${email} has been successfully connected!`,
        );
      } catch (error) {
        this.logger.error(
          `Connection test failed: ${this.getErrorMessage(error)}`,
        );
        await this.emailAccountService.remove(account.id);
        await ctx.reply(
          `❌ Failed to connect to your email account. Please check your settings and try again.\n\nError: ${this.getErrorMessage(error)}`,
        );
      }

      // Clear data
      ctx.session.emailData = null;

      // Exit scene
      await ctx.scene.leave();
    } catch (error) {
      this.logger.error(
        `Error saving email account: ${this.getErrorMessage(error)}`,
      );
      await ctx.reply(
        '❌ An error occurred while saving your email account. Please try again.',
      );
      await ctx.scene.leave();
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
