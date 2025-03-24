import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getIndex(@Res() res): void {
    return res.sendFile('index.html', { root: 'public' });
  }

  @Get('api/status')
  getStatus(): { status: string; version: string; timestamp: string } {
    return {
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
