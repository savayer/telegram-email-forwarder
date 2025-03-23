import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailAccount } from './email-account.entity';
import { EmailAccountService } from './email-account.service';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailAccount]), EncryptionModule],
  providers: [EmailAccountService],
  exports: [EmailAccountService],
})
export class EmailAccountModule {}
