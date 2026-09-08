// src/config/data-source.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Otp } from '../auth/entities/otp.entity';
import { Kyc } from '../kyc/entities/kyc.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { Withdrawal } from '../wallet/entities/withdrawal.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Order } from '../orders/entities/order.entity';
import { StaffAuditLog } from '../staff/entities/staff-audit-log.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    Otp,
    Kyc,
    Wallet,
    WalletTransaction,
    Withdrawal,
    Offer,
    Order,
    StaffAuditLog,
  ],
  synchronize: false,
  migrations: ['dist/migrations/*.js'],
  logging: true,
});
