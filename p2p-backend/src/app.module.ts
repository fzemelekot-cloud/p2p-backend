// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // ⏳ Added: Scheduler import
import { TerminusModule } from '@nestjs/terminus'; // 🏥 Added: Infrastructure Health Check Engine

import { AppController } from './app.controller';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { KycModule } from './kyc/kyc.module';
import { WalletModule } from './wallet/wallet.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { StaffModule } from './staff/staff.module'; // 🚀 Added: Enterprise Staff Management Module

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // ⏳ Added: Initializes background worker schedules globally
    TerminusModule, // 🏥 Added: Exposes standard health tools globally for the health controller

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false, // 🛑 PERMANENT FIX: Set to false to prevent enum collision loops
      }),
    }),

    UsersModule,
    AuthModule,
    KycModule,
    WalletModule,
    OffersModule,
    OrdersModule,
    StaffModule, // 🚀 Added: Connects the staff promotional architecture to the app context
  ],
  controllers: [AppController],
})
export class AppModule {}