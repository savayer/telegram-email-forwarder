import { Module } from '@nestjs/common';
import { ImapService } from './imap.service';
import { forwardRef } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [forwardRef(() => TelegramModule)],
  providers: [ImapService],
  exports: [ImapService],
})
export class ImapModule {}
