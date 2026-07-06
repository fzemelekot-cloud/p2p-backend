// src/offers/offers.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { TransactionType } from '../wallet/enums/transaction-type.enum';
import { OfferStatus } from './enums/offer-status.enum';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. Creation logic
  async createOffer(userId: string, dto: CreateOfferDto): Promise<Offer> {
    const amountToLock = parseFloat(dto.totalAmount);
    if (isNaN(amountToLock) || amountToLock <= 0) {
      throw new BadRequestException('Invalid total amount');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new BadRequestException('Wallet structure not found');

      const currentBalance = parseFloat(wallet.balance);
      if (currentBalance < amountToLock) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      wallet.balance = (currentBalance - amountToLock).toString();
      wallet.lockedBalance = (parseFloat(wallet.lockedBalance || '0') + amountToLock).toString();
      await queryRunner.manager.save(Wallet, wallet);

      const offer = queryRunner.manager.create(Offer, {
        userId,
        assetType: dto.assetType,
        totalAmount: dto.totalAmount,
        remainingAmount: dto.totalAmount,
        pricePerUnit: dto.pricePerUnit,
        status: OfferStatus.ACTIVE,
      });
      const savedOffer = await queryRunner.manager.save(Offer, offer);

      const ledgerEntry = queryRunner.manager.create(WalletTransaction, {
        walletId: wallet.id,
        userId,
        type: TransactionType.ESCROW_LOCK,
        amount: dto.totalAmount,
        referenceId: savedOffer.id,
        description: `Escrow lock applied: ${dto.totalAmount} ${dto.assetType}`,
      });
      await queryRunner.manager.save(WalletTransaction, ledgerEntry);

      await queryRunner.commitTransaction();
      return savedOffer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 2. Browsing logic
  async findActiveOffers(): Promise<Offer[]> {
    return await this.offerRepository.find({
      where: { status: OfferStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  // 3. Single Fetch logic
  async findOne(id: string): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id },
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${id} not found`);
    }

    return offer;
  }

  // 4. Dashboard logic
  async findUserOffers(userId: string): Promise<Offer[]> {
    return await this.offerRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 5. Cancellation logic (Task 4)
  async cancelOffer(offerId: string, userId: string): Promise<Offer> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find and lock the offer to prevent concurrent modifications (like matching engine processing)
      const offer = await queryRunner.manager.findOne(Offer, {
        where: { id: offerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!offer) {
        throw new NotFoundException(`Offer with ID ${offerId} not found`);
      }

      // Security Check: Target offer must belong to the current authenticated user
      if (offer.userId !== userId) {
        throw new ForbiddenException('Cannot cancel another user\'s offer');
      }

      // Business Rule Check: Completed offers cannot be modified
      if (offer.status === OfferStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel completed offer');
      }

      // Business Rule Check: Idempotency handler if already cancelled
      if (offer.status === OfferStatus.CANCELLED) {
        throw new BadRequestException('Offer is already cancelled');
      }

      const refundAmount = parseFloat(offer.remainingAmount);

      // If liquidity remains, execute database vault modifications safely
      if (refundAmount > 0) {
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!wallet) {
          throw new BadRequestException('User wallet not found');
        }

        // Return remaining funds from lockedBalance back to spendable balance
        wallet.lockedBalance = (parseFloat(wallet.lockedBalance || '0') - refundAmount).toString();
        wallet.balance = (parseFloat(wallet.balance || '0') + refundAmount).toString();
        await queryRunner.manager.save(Wallet, wallet);

        // Create immutable ledger entry for accountability audit trail
        const ledgerEntry = queryRunner.manager.create(WalletTransaction, {
          walletId: wallet.id,
          userId,
          type: TransactionType.ESCROW_REFUND,
          amount: offer.remainingAmount,
          referenceId: offer.id,
          description: `Escrow refund applied from cancelled offer: ${offer.remainingAmount} ${offer.assetType}`,
        });
        await queryRunner.manager.save(WalletTransaction, ledgerEntry);
      }

      // Transition entity status to final operational state
      offer.status = OfferStatus.CANCELLED;
      const updatedOffer = await queryRunner.manager.save(Offer, offer);

      await queryRunner.commitTransaction();
      return updatedOffer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}