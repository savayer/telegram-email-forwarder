import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';

interface EmailNotificationParams {
  chatId: number;
  emailAccountId: number;
  messageId: string;
  from: string;
  subject: string;
  date: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

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

  // Helper method to escape markdown characters for Telegram's MarkdownV2 format
  private escapeMarkdown(text: string): string {
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
