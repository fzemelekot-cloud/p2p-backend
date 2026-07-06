import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  walletId: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: string;

  @Column()
  targetAddress: string; // The external TRON address where the user wants funds sent

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ nullable: true })
  txHash: string; // Captured once broadcasted to the TRON network

  @Column({ nullable: true })
  adminId: string; // Keeps track of who reviewed it

  @Column({ nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}