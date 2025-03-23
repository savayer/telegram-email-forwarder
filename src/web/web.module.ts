import { Module } from '@nestjs/common';
import { WebController } from './web.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [WebController],
  providers: [],
})
export class WebModule {}
