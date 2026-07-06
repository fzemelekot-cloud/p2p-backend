import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 🛑 Keeps the critical guard: Prevents a single user from getting multiple wallet rows
  @Column({ unique: true })
  userId: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: '0.00000000' })
  balance: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: '0.00000000' })
  lockedBalance: string;

  // Legacy/Default field tracking (made nullable so it doesn't break existing mock entries)
  @Column({ nullable: true })
  depositAddress: string;

  // Added for secure HD Wallet implementation
  @Column({ nullable: true, unique: true })
  tronDepositAddress: string;

  // Added to track derivation offsets sequentially across your system branch
  @Column({ type: 'int', nullable: true, unique: true })
  derivationIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}