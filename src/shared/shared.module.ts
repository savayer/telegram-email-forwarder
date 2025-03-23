import { Global, Module } from '@nestjs/common';
import { EmailAccountModule } from '../email-account/email-account.module';

@Global()
@Module({
  imports: [EmailAccountModule],
  exports: [EmailAccountModule],
})
export class SharedModule {}
