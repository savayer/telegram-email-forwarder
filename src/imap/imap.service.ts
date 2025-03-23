import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { EmailAccountService } from '../email-account/email-account.service';
import { TelegramService } from '../telegram/telegram.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface EmailConnection {
  accountId: number;
  client: ImapFlow;
  isActive: boolean;
}

@Injectable()
export class ImapService implements OnModuleInit {
  private readonly logger = new Logger(ImapService.name);
  private readonly connections: Map<number, EmailConnection> = new Map();
  private isInitialized = false;

  constructor(
    private emailAccountService: EmailAccountService,
    private telegramService: TelegramService,
  ) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  async onModuleInit() {
    try {
      await this.initializeConnections();
      this.isInitialized = true;
      this.logger.log('IMAP service initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize IMAP service: ${this.getErrorMessage(error)}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshConnections() {
    this.logger.log('Refreshing IMAP connections');
    // Close existing connections
    for (const connection of this.connections.values()) {
      await this.closeConnection(connection.accountId);
    }

    // Create fresh connections
    await this.initializeConnections();
  }

  private async initializeConnections() {
    const activeAccounts = await this.emailAccountService.findActiveAccounts();
    this.logger.log(
      `Initializing connections for ${activeAccounts.length} active accounts`,
    );

    for (const account of activeAccounts) {
      try {
        await this.connectAccount(account.id);
      } catch (error) {
        this.logger.error(
          `Failed to connect account ${account.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }
  }

  async connectAccount(accountId: number) {
    // Check if already connected
    if (
      this.connections.has(accountId) &&
      this.connections.get(accountId)?.isActive
    ) {
      return;
    }

    const account =
      await this.emailAccountService.getDecryptedAccount(accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    try {
      const client = new ImapFlow({
        host: account.imapHost,
        port: account.imapPort,
        secure: account.useTls,
        auth: {
          user: account.email,
          pass: account.decryptedPassword,
        },
        logger: false,
      });

      // Store the connection
      this.connections.set(accountId, {
        accountId,
        client,
        isActive: true,
      });

      // Connect to the server
      await client.connect();
      this.logger.log(`Connected to account ${account.email}`);

      // Setup listener for new emails
      this.listenForNewEmails(accountId);

      return client;
    } catch (error) {
      this.logger.error(
        `Failed to connect to IMAP server for account ${accountId}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private async closeConnection(accountId: number) {
    const connection = this.connections.get(accountId);
    if (!connection) {
      return;
    }

    try {
      connection.isActive = false;
      await connection.client.logout();
      this.connections.delete(accountId);
      this.logger.log(`Closed connection for account ${accountId}`);
    } catch (error) {
      this.logger.error(
        `Error closing connection for account ${accountId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async listenForNewEmails(accountId: number) {
    const connection = this.connections.get(accountId);
    if (!connection || !connection.isActive) {
      return;
    }

    const account = await this.emailAccountService.findOne(accountId);
    if (!account) {
      return;
    }

    try {
      // Select the INBOX
      await connection.client.mailboxOpen('INBOX');

      // Set up event handler for new emails
      connection.client.on('exists', async (data) => {
        if (!connection.isActive) return;

        const { count } = data;
        this.logger.log(
          `New email detected for account ${account.email}, total: ${count}`,
        );

        // Check for new messages (unseen)
        try {
          // Find unseen messages
          const messages = await connection.client.search({ unseen: true });

          for (const seq of messages) {
            // Fetch the message
            const message = await connection.client.fetchOne(seq, {
              source: true,
            });
            const { envelope } = message;

            // Parse email details
            const from = envelope.from?.[0]
              ? `${envelope.from[0].name || ''} <${envelope.from[0].address}>`
              : 'Unknown Sender';
            const subject = envelope.subject || '(No Subject)';
            const date = envelope.date
              ? new Date(envelope.date).toLocaleString()
              : 'Unknown Date';

            // Send notification to Telegram
            await this.telegramService.sendEmailNotification({
              chatId: account.chatId,
              emailAccountId: accountId,
              messageId: seq.toString(),
              from,
              subject,
              date,
            });
          }
        } catch (error) {
          this.logger.error(
            `Error processing new emails for account ${account.email}: ${this.getErrorMessage(error)}`,
          );
        }
      });

      // Start IDLE to listen for new emails
      if (connection.client.usable) {
        this.logger.log(`Starting IDLE for account ${account.email}`);
        connection.client.idle();
      }
    } catch (error) {
      this.logger.error(
        `Error setting up email listener for account ${account.email}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async markAsRead(accountId: number, messageId: string) {
    const connection = this.connections.get(accountId);
    if (!connection || !connection.isActive) {
      await this.connectAccount(accountId);
    }

    try {
      const client = this.connections.get(accountId)?.client;
      if (client && client.usable) {
        await client.mailboxOpen('INBOX');
        await client.messageFlagsAdd(messageId, ['\\Seen']);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(
        `Error marking message as read: ${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }

  async markAsSpam(accountId: number, messageId: string) {
    const connection = this.connections.get(accountId);
    if (!connection || !connection.isActive) {
      await this.connectAccount(accountId);
    }

    try {
      const client = this.connections.get(accountId)?.client;
      if (client && client.usable) {
        // First, open the INBOX
        await client.mailboxOpen('INBOX');

        // Move the message to the Junk/Spam folder
        // Note: Different email providers might use different folder names for spam
        // Common names: Junk, Spam, Junk E-mail
        const spamFolderNames = ['Junk', 'Spam', 'Junk E-mail'];

        // Try to find a spam folder
        const mailboxes = await client.list();
        const spamFolder = mailboxes.find((box) =>
          spamFolderNames.some(
            (name) => box.name.includes(name) || box.path.includes(name),
          ),
        );

        if (spamFolder) {
          // Move to spam folder
          await client.messageMove(messageId, spamFolder.path);
          return true;
        } else {
          // If no spam folder found, just mark with Junk flag
          await client.messageFlagsAdd(messageId, ['$Junk', '\\Seen']);
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error(
        `Error marking message as spam: ${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }
}
