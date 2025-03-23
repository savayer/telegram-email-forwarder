import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private configService: ConfigService) {
    // Get encryption key and iv from environment variables, or generate them
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const encryptionIv = this.configService.get<string>('ENCRYPTION_IV');

    if (!encryptionKey || !encryptionIv) {
      throw new Error(
        'ENCRYPTION_KEY and ENCRYPTION_IV must be set in environment variables',
      );
    }

    // Create buffer from hexadecimal string
    this.key = Buffer.from(encryptionKey, 'hex');
    this.iv = Buffer.from(encryptionIv, 'hex');
  }

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate random encryption key and IV in hex format
   * This can be used to generate initial values for environment variables
   */
  static generateEncryptionKeys(): { key: string; iv: string } {
    const key = crypto.randomBytes(32).toString('hex'); // 32 bytes = 256 bits
    const iv = crypto.randomBytes(16).toString('hex'); // 16 bytes = 128 bits
    return { key, iv };
  }
}
