import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Indexing the phone column ensures our rate-limiting queries run instantly
  @Index()
  @Column()
  phone: string;

  // This will store the SHA-256 hash of the 6-digit code, never the plain text
  @Column()
  code: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}