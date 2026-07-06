// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 🔄 Improvement 6: Standardized to state-based naming convention to prevent runtime integration bugs
export enum UserStatus {
  PENDING_KYC = 'PENDING_KYC',
  VERIFIED_KYC = 'VERIFIED_KYC', // 👈 Standardized from VERIFIED
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED', 
}

export enum UserRole {
  USER = 'USER',
  SUPPORT = 'SUPPORT',
  COMPLIANCE = 'COMPLIANCE',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true }) 
  phone: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_KYC,
  })
  status: UserStatus; 

  // Stores the history snapshot before a ban lock triggers
  @Column({
    type: 'enum',
    enum: UserStatus,
    nullable: true,
    default: null,
  })
  previousStatus: UserStatus | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn() 
  updatedAt: Date;
}