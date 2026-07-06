// src/orders/orders.service.ts
import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { MatchOrderDto } from './dto/match-order.dto';
import { Offer } from '../offers/entities/offer.entity';
import { OfferStatus } from '../offers/enums/offer-status.enum';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { TransactionType } from '../wallet/enums/transaction-type.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  // STEP 1: Match Order (Sets expiration window & handles status transitions)
  async matchOrder(buyerId: string, dto: MatchOrderDto): Promise<Order> {
    const orderAmount = parseFloat(dto.amount);
    if (isNaN(orderAmount) || orderAmount <= 0) throw new BadRequestException('Invalid amount');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const offer = await queryRunner.manager.findOne(Offer, {
        where: { id: dto.offerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.userId === buyerId) throw new BadRequestException('You cannot buy your own offer');

      const remaining = parseFloat(offer.remainingAmount);
      if (remaining < orderAmount) throw new BadRequestException('Insufficient offer liquidity');

      // Deduct from open marketplace liquidity
      offer.remainingAmount = (remaining - orderAmount).toString();
      
      // Task 7: Automatically transition offer status on deduction
      this.autoTransitionOfferStatus(offer);
      
      await queryRunner.manager.save(Offer, offer);

      // Set explicit expiration window (e.g., 30 minutes from now)
      const expirationWindow = new Date();
      expirationWindow.setMinutes(expirationWindow.getMinutes() + 30);

      const order = queryRunner.manager.create(Order, {
        offerId: dto.offerId,
        buyerId,
        sellerId: offer.userId, 
        amount: dto.amount,
        status: OrderStatus.PENDING_PAYMENT, 
        expiresAt: expirationWindow,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // STEP 2: Mark Paid
  async markAsPaid(buyerId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new BadRequestException('Unauthorized action');
    
    // Check expiration before allowing payment updates
    if (new Date() > order.expiresAt) {
      throw new BadRequestException('Order has expired. Please request a cancellation refund.');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not in a payable state');
    }

    order.status = OrderStatus.MARKED_PAID;
    return await this.orderRepository.save(order);
  }

  // STEP 3: Symmetric Release Logic (Seller Confirms)
  async confirmReceiptAndRelease(sellerId: string, orderId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.sellerId !== sellerId) throw new BadRequestException('Unauthorized action');
      if (order.status !== OrderStatus.MARKED_PAID) {
        throw new BadRequestException('Payment has not been claimed by buyer yet');
      }

      await this.executeEscrowReleaseState(queryRunner, order);

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // STEP 4: Cancellation Engine (Handles user aborts or cron timeouts)
  async cancelOrder(userId: string, orderId: string, isSystem = false): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) throw new NotFoundException('Order not found');
      
      // Enforce business protections on who can cancel and when
      if (!isSystem) {
        if (order.buyerId !== userId && order.sellerId !== userId) {
          throw new BadRequestException('Unauthorized action');
        }
        if (order.status === OrderStatus.MARKED_PAID) {
          throw new BadRequestException('Cannot cancel an order marked as paid. Please open a dispute.');
        }
      }
      
      if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.DISPUTED) {
        throw new BadRequestException('Order cannot be cancelled from its current state');
      }

      await this.executeEscrowRefundState(queryRunner, order);

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // STEP 5: File Active Dispute
  async fileDispute(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new BadRequestException('You are not associated with this trade');
    }
    if (order.status !== OrderStatus.MARKED_PAID && order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Cannot dispute an inactive trade');
    }

    order.status = OrderStatus.DISPUTED;
    return await this.orderRepository.save(order);
  }

  // STEP 6: Dashboard: Fetch all orders where the user is either the buyer or the seller
  async findUserOrders(userId: string): Promise<Order[]> {
    return await this.orderRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId },
      ],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // STEP 7: Order Details Fetching with ACL Enforcement (Task 6)
  async findOrderDetails(orderId: string, userId: string, role?: string, isAdmin?: boolean): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;
    const isPrivileged = role === 'admin' || isAdmin === true;

    if (!isBuyer && !isSeller && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return order;
  }

  // ==========================================
  //  ADMIN RESOLUTION GATEWAYS (Dispute Core)
  // ==========================================

  async adminResolveDispute(orderId: string, resolution: 'release' | 'refund'): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.DISPUTED) {
        throw new BadRequestException('This order is not currently in dispute status');
      }

      if (resolution === 'release') {
        await this.executeEscrowReleaseState(queryRunner, order);
      } else {
        await this.executeEscrowRefundState(queryRunner, order);
      }

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==========================================
  // NEW: ADMINISTRATIVE DISPUTE QUEUE QUERIES
  // ==========================================

  // Fetch all active disputes ordered by most recently updated
  async findAllDisputesForAdmin(): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status: OrderStatus.DISPUTED },
      order: { updatedAt: 'DESC' }, 
    });
  }

  // Fetch a specific dispute with strict error enforcement
  async findOneDisputeForAdmin(id: string): Promise<Order> {
    const dispute = await this.orderRepository.findOne({
      where: { id, status: OrderStatus.DISPUTED },
    });

    if (!dispute) {
      throw new NotFoundException(`Disputed order with ID ${id} not found`);
    }
    return dispute;
  }

  // ==========================================
  //        REUSABLE ATOMIC ACCOUNTING PIPELINES
  // ==========================================

  private async executeEscrowReleaseState(queryRunner: any, order: Order): Promise<void> {
    const orderAmount = parseFloat(order.amount);

    const sellerWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: order.sellerId }, lock: { mode: 'pessimistic_write' } });
    const buyerWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: order.buyerId }, lock: { mode: 'pessimistic_write' } });

    if (!sellerWallet || !buyerWallet) throw new InternalServerErrorException('Financial routing context broken');

    sellerWallet.lockedBalance = (parseFloat(sellerWallet.lockedBalance) - orderAmount).toString();
    buyerWallet.balance = (parseFloat(buyerWallet.balance) + orderAmount).toString();

    await queryRunner.manager.save(Wallet, sellerWallet);
    await queryRunner.manager.save(Wallet, buyerWallet);

    order.status = OrderStatus.COMPLETED;
    await queryRunner.manager.save(Order, order);

    const transaction = queryRunner.manager.create(WalletTransaction, {
      walletId: buyerWallet.id,
      userId: order.buyerId,
      type: TransactionType.TRADE_SETTLEMENT,
      amount: order.amount,
      referenceId: order.id,
      description: `Escrow Released: Credited from seller ${order.sellerId}`,
    });
    await queryRunner.manager.save(WalletTransaction, transaction);
  }

  private async executeEscrowRefundState(queryRunner: any, order: Order): Promise<void> {
    const orderAmount = parseFloat(order.amount);

    const sellerWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: order.sellerId }, lock: { mode: 'pessimistic_write' } });
    const offer = await queryRunner.manager.findOne(Offer, { where: { id: order.offerId }, lock: { mode: 'pessimistic_write' } });

    if (!sellerWallet || !offer) throw new InternalServerErrorException('Financial routing context broken');

    sellerWallet.lockedBalance = (parseFloat(sellerWallet.lockedBalance) - orderAmount).toString();
    sellerWallet.balance = (parseFloat(sellerWallet.balance) + orderAmount).toString();
    
    // Put liquidity back onto the open public offer board
    offer.remainingAmount = (parseFloat(offer.remainingAmount) + orderAmount).toString();

    // Task 7: Automatically transition offer status on refund
    this.autoTransitionOfferStatus(offer);

    await queryRunner.manager.save(Wallet, sellerWallet);
    await queryRunner.manager.save(Offer, offer);

    order.status = OrderStatus.CANCELLED;
    await queryRunner.manager.save(Order, order);
  }

  // ==========================================
  //        AUTOMATIC LIFECYCLE ENGINE (Task 7)
  // ==========================================
  
  private autoTransitionOfferStatus(offer: Offer): void {
    if (offer.status === OfferStatus.CANCELLED) {
      return;
    }

    const remaining = Number(parseFloat(offer.remainingAmount).toFixed(8));
    const total = Number(parseFloat(offer.totalAmount).toFixed(8));

    if (remaining <= 0) {
      offer.status = OfferStatus.COMPLETED;
    } else if (remaining < total) {
      offer.status = OfferStatus.PARTIALLY_FILLED;
    } else if (remaining === total) {
      offer.status = OfferStatus.ACTIVE;
    }
  }
}