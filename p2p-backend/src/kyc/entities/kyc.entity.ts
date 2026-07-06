import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KycStatus } from '../enums/kyc-status.enum';
import { KycDocumentType } from '../enums/document-type.enum';
import { User } from '../../users/entities/user.entity'; 

@Entity('kyc_submissions')
export class Kyc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 🛑 Database-level protection against race conditions and duplicate entries
  @Column({ unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: KycDocumentType,
  })
  documentType: KycDocumentType;

  @Column()
  documentNumber: string;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}