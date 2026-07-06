import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller'; 
import { WalletService } from './wallet.service';
import { DepositMonitorService } from './deposit-monitor.service';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Withdrawal } from './entities/withdrawal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction, Withdrawal]),
  ],
  controllers: [WalletController, AdminWalletController], 
  providers: [WalletService, DepositMonitorService],
  exports: [WalletService, DepositMonitorService], // ◄── Updated to export both services
})
export class WalletModule {}