import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { EncryptionService } from './encryption/encryption.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Setup static file serving
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Enable CORS for frontend
  app.enableCors();

  // Get the port from environment variables or use 3000 as default
  const port = process.env.PORT || 3000;

  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log('Telegram bot is active and listening for messages');
}

// Generate encryption keys helper function
function generateEncryptionKeys() {
  const keys = EncryptionService.generateEncryptionKeys();
  console.log('Encryption Keys:');
  console.log(`ENCRYPTION_KEY=${keys.key}`);
  console.log(`ENCRYPTION_IV=${keys.iv}`);
}

// Check for command line arguments
if (process.argv.includes('--generate-keys')) {
  generateEncryptionKeys();
} else {
  bootstrap();
}
