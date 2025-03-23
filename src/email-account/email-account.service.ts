import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailAccount } from './email-account.entity';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class EmailAccountService {
  constructor(
    @InjectRepository(EmailAccount)
    private emailAccountRepository: Repository<EmailAccount>,
    private encryptionService: EncryptionService,
  ) {}

  async findAll(): Promise<EmailAccount[]> {
    return this.emailAccountRepository.find();
  }

  async findByUserId(userId: number): Promise<EmailAccount[]> {
    return this.emailAccountRepository.find({ where: { userId } });
  }

  async findByChatId(chatId: number): Promise<EmailAccount[]> {
    return this.emailAccountRepository.find({ where: { chatId } });
  }

  async findActiveAccounts(): Promise<EmailAccount[]> {
    return this.emailAccountRepository.find({ where: { isActive: true } });
  }

  async findOne(id: number): Promise<EmailAccount | null> {
    return this.emailAccountRepository.findOne({ where: { id } });
  }

  async create(accountData: Partial<EmailAccount>): Promise<EmailAccount> {
    // Encrypt the password before saving
    if (accountData.password) {
      accountData.password = this.encryptionService.encrypt(
        accountData.password,
      );
    }

    const emailAccount = this.emailAccountRepository.create(accountData);
    return this.emailAccountRepository.save(emailAccount);
  }

  async update(
    id: number,
    accountData: Partial<EmailAccount>,
  ): Promise<EmailAccount | null> {
    // Encrypt the password if it's included in the update
    if (accountData.password) {
      accountData.password = this.encryptionService.encrypt(
        accountData.password,
      );
    }

    await this.emailAccountRepository.update(id, accountData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.emailAccountRepository.delete(id);
  }

  async getDecryptedAccount(
    id: number,
  ): Promise<(EmailAccount & { decryptedPassword: string }) | null> {
    const account = await this.findOne(id);
    if (!account) {
      return null;
    }

    // Return a copy of the account with decrypted password
    return {
      ...account,
      decryptedPassword: this.encryptionService.decrypt(account.password),
    };
  }

  async deactivateAccount(id: number): Promise<EmailAccount | null> {
    return this.update(id, { isActive: false });
  }

  async activateAccount(id: number): Promise<EmailAccount | null> {
    return this.update(id, { isActive: true });
  }

  async updatePassword(
    id: number,
    newPassword: string,
  ): Promise<EmailAccount | null> {
    // Encrypt the new password
    const encryptedPassword = this.encryptionService.encrypt(newPassword);

    // Find the account
    const account = await this.findOne(id);
    if (!account) {
      return null;
    }

    // Update the password
    account.password = encryptedPassword;

    // Save the updated account
    return this.emailAccountRepository.save(account);
  }
}
