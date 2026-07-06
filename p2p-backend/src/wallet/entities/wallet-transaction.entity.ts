import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { TransactionType } from '../enums/transaction-type.enum';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  // 🪙 Changed precision scale to 8 to match TRON/USDT fractional standards
  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: string;

  // 🛡️ Added for Task 4: Prevents double-crediting by tracking on-chain TxIDs
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  referenceHash: string | null;

  // 🛑 Kept for P2P trading matching: Will store trade UUIDs later
  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  // 📝 Kept: Explains the reason for the ledger entry
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // 🔄 Added: Standard operational tracking timestamps
  @UpdateDateColumn()
  updatedAt: Date;
}