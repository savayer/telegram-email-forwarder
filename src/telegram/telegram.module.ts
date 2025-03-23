import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import {
  TelegramBotController,
  AddEmailScene,
  ADD_EMAIL_SCENE,
} from './telegram.bot.controller';
import { ImapModule } from '../imap/imap.module';
import { EmailAccountModule } from '../email-account/email-account.module';

@Module({
  imports: [ImapModule, EmailAccountModule],
  providers: [TelegramService, TelegramBotController, AddEmailScene],
  exports: [TelegramService],
})
export class TelegramModule {}
