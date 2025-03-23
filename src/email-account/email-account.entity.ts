import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_accounts')
export class EmailAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  chatId: number;

  @Column()
  email: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  imapHost: string;

  @Column({ nullable: true })
  imapPort: number;

  @Column({ nullable: true })
  smtpHost: string;

  @Column({ nullable: true })
  smtpPort: number;

  @Column({ default: true })
  useTls: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
