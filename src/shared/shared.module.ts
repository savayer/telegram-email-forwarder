import { Global, Module } from '@nestjs/common';
import { EmailAccountModule } from '../email-account/email-account.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ImapModule } from '../imap/imap.module';

@Global()
@Module({
  imports: [EmailAccountModule, TelegramModule, ImapModule],
  exports: [EmailAccountModule, TelegramModule, ImapModule],
})
export class SharedModule {}
