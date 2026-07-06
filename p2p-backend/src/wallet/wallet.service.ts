import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { TransactionType } from './enums/transaction-type.enum';
import { TronWeb } from 'tronweb'; // 🛠️ Uses the strict TronWeb v6 named export class
import * as crypto from 'crypto';

// 👇 New Withdrawal Imports Added Safely
import { Withdrawal } from './entities/withdrawal.entity';
import { WithdrawalStatus } from './enums/withdrawal-status.enum';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.walletRepository.findOne({
      where: { userId },
    });
  }

  async createWallet(userId: string): Promise<Wallet> {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const depositAddress = `TRON_TEST_${randomSuffix}`;

    const wallet = this.walletRepository.create({
      userId,
      depositAddress,
      balance: '0.00000000',
      lockedBalance: '0.00000000',
    });

    return await this.walletRepository.save(wallet);
  }

  /**
   * 🔑 Provisions a deterministic BIP44 TRON deposit address using an incremental HD system
   */
  async getOrCreateDepositAddress(userId: string): Promise<{ address: string }> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    
    if (!wallet) {
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      wallet = this.walletRepository.create({
        userId,
        depositAddress: `TRON_TEST_${randomSuffix}`,
        balance: '0.00000000',
        lockedBalance: '0.00000000',
      });
      wallet = await this.walletRepository.save(wallet);
    }

    if (wallet.tronDepositAddress) {
      return { address: wallet.tronDepositAddress };
    }

    const mnemonic = process.env.TRON_MNEMONIC;
    if (!mnemonic) {
      throw new InternalServerErrorException('Master wallet seed configuration is missing in environment variables');
    }

    return await this.dataSource.transaction(async (entityManager) => {
      const lockedWallet = await entityManager.findOne(Wallet, { where: { userId } });
      
      if (!lockedWallet) {
        throw new NotFoundException('Wallet row not found within transaction scope');
      }

      if (lockedWallet.tronDepositAddress) {
        return { address: lockedWallet.tronDepositAddress };
      }

      const systemMaxResult = await entityManager
        .createQueryBuilder(Wallet, 'wallet')
        .select('MAX(wallet.derivationIndex)', 'max')
        .getRawOne();

      const nextIndex = systemMaxResult.max !== null ? systemMaxResult.max + 1 : 0;
      const derivationPath = `m/44'/195'/0'/0/${nextIndex}`;

      try {
        const account = TronWeb.fromMnemonic(mnemonic, derivationPath, '', undefined);
        
        lockedWallet.tronDepositAddress = account.address;
        lockedWallet.derivationIndex = nextIndex;

        await entityManager.save(lockedWallet);

        return { address: account.address };
      } catch (err) {
        throw new InternalServerErrorException('Cryptographic derivation routine failed offline');
      }
    });
  }

  /**
   * 💵 Simulate Deposit (Development Only)
   */
  async simulateDeposit(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('No wallet found for this user account');
    }

    const currentBalance = parseFloat(wallet.balance || '0');
    const depositAmount = Number(amount);
    
    const newBalance = currentBalance + depositAmount;
    wallet.balance = newBalance.toFixed(8);

    const savedWallet = await this.walletRepository.save(wallet);

    const transactionRecord = this.transactionRepository.create({
      walletId: wallet.id,
      userId: wallet.userId,
      type: TransactionType.DEPOSIT,
      amount: depositAmount.toFixed(8),
    });
    await this.transactionRepository.save(transactionRecord);

    return savedWallet;
  }

  /**
   * 📉 Debit Balance
   */
  async debitBalance(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('No wallet found for this user account');
    }

    const currentBalance = parseFloat(wallet.balance || '0');
    const debitAmount = Number(amount);

    if (currentBalance < debitAmount) {
      throw new BadRequestException('Insufficient balance available');
    }

    const newBalance = currentBalance - debitAmount;
    wallet.balance = newBalance.toFixed(8);

    const savedWallet = await this.walletRepository.save(wallet);

    const transactionRecord = this.transactionRepository.create({
      walletId: wallet.id,
      userId: wallet.userId,
      type: TransactionType.WITHDRAWAL,
      amount: debitAmount.toFixed(8),
    });
    await this.transactionRepository.save(transactionRecord);

    return savedWallet;
  }

  /**
   * 📥 1. User Initiative Flow: Create a Withdrawal Request
   * 🔒 Uses pessimistic locking to prevent race-conditions
   */
  async requestWithdrawal(userId: string, targetAddress: string, amount: number): Promise<Withdrawal> {
    if (amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than zero');
    }

    if (!targetAddress.startsWith('T') || targetAddress.length !== 34) {
      throw new BadRequestException('Invalid destination TRON address format');
    }

    return await this.dataSource.transaction(async (entityManager) => {
      const wallet = await entityManager.findOne(Wallet, { 
        where: { userId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet) {
        throw new NotFoundException('Wallet container not found for this user account');
      }

      const currentBalance = parseFloat(wallet.balance || '0');
      const requestedAmount = Number(amount);

      if (currentBalance < requestedAmount) {
        throw new BadRequestException('Insufficient available balance to complete withdrawal request');
      }

      const newBalance = currentBalance - requestedAmount;
      const currentLocked = parseFloat(wallet.lockedBalance || '0');
      const newLocked = currentLocked + requestedAmount;

      wallet.balance = newBalance.toFixed(8);
      wallet.lockedBalance = newLocked.toFixed(8);
      await entityManager.save(wallet);

      const withdrawal = entityManager.create(Withdrawal, {
        userId: wallet.userId,
        walletId: wallet.id,
        amount: requestedAmount.toFixed(8),
        targetAddress,
        status: WithdrawalStatus.PENDING,
      });

      return await entityManager.save(withdrawal);
    });
  }

  /**
   * 👑 Admin Flow: Approve a Withdrawal Request
   * Deducts the amount from lockedBalance permanently and moves status to SUCCESS.
   */
  async approveWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal> {
    return await this.dataSource.transaction(async (entityManager) => {
      const withdrawal = await entityManager.findOne(Withdrawal, {
        where: { id: withdrawalId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request record not found');
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(`Cannot approve a withdrawal that is already ${withdrawal.status}`);
      }

      const wallet = await entityManager.findOne(Wallet, {
        where: { id: withdrawal.walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Associated wallet account container not found');
      }

      const currentLocked = parseFloat(wallet.lockedBalance || '0');
      const withdrawalAmount = parseFloat(withdrawal.amount);

      if (currentLocked < withdrawalAmount) {
        throw new InternalServerErrorException('Escrow balance mismatch error detected');
      }

      wallet.lockedBalance = (currentLocked - withdrawalAmount).toFixed(8);
      await entityManager.save(wallet);

      withdrawal.status = WithdrawalStatus.SUCCESS;
      withdrawal.adminId = adminId;
      withdrawal.txHash = `MOCK_TRX_HASH_${crypto.randomBytes(16).toString('hex')}`;

      const savedWithdrawal = await entityManager.save(withdrawal);

      const transactionRecord = this.transactionRepository.create({
        walletId: wallet.id,
        userId: wallet.userId,
        type: TransactionType.WITHDRAWAL,
        amount: withdrawalAmount.toFixed(8),
      });
      await this.transactionRepository.save(transactionRecord);

      return savedWithdrawal;
    });
  }

  /**
   * 👑 Admin Flow: Reject a Withdrawal Request
   * Returns the escrowed amount from lockedBalance back into spendable balance.
   */
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<Withdrawal> {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('A reason context must be supplied for record rejections');
    }

    return await this.dataSource.transaction(async (entityManager) => {
      const withdrawal = await entityManager.findOne(Withdrawal, {
        where: { id: withdrawalId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request record not found');
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(`Cannot reject a withdrawal that is already ${withdrawal.status}`);
      }

      const wallet = await entityManager.findOne(Wallet, {
        where: { id: withdrawal.walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Associated wallet account container not found');
      }

      const currentBalance = parseFloat(wallet.balance || '0');
      const currentLocked = parseFloat(wallet.lockedBalance || '0');
      const withdrawalAmount = parseFloat(withdrawal.amount);

      if (currentLocked < withdrawalAmount) {
        throw new InternalServerErrorException('Escrow balance mismatch error detected');
      }

      wallet.balance = (currentBalance + withdrawalAmount).toFixed(8);
      wallet.lockedBalance = (currentLocked - withdrawalAmount).toFixed(8);
      await entityManager.save(wallet);

      withdrawal.status = WithdrawalStatus.REJECTED;
      withdrawal.adminId = adminId;
      withdrawal.rejectionReason = reason;

      return await entityManager.save(withdrawal);
    });
  }
}