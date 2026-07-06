import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OfferStatus } from '../enums/offer-status.enum'; // ◄── Import the new enum file

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  assetType: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  totalAmount: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  remainingAmount: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  pricePerUnit: string;

  // Use the imported enum here
  @Column({
    type: 'enum',
    enum: OfferStatus, 
    default: OfferStatus.ACTIVE,
  })
  status: OfferStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}