// src/config/data-source.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Kyc } from '../kyc/entities/kyc.entity';
import { StaffAuditLog } from '../staff/entities/staff-audit-log.entity';

config(); // Loads environment variables from your .env file

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // ⚡️ Uses the exact string from your .env file
  entities: [User, Kyc, StaffAuditLog], // Add any other entities here if needed
  synchronize: false, // 🛑 Keeps auto-sync safely off
  migrations: ['dist/migrations/*.js'],
  logging: true,
});