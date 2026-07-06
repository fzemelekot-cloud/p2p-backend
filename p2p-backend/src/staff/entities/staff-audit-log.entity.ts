// src/staff/entities/staff-audit-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';

@Entity('staff_audit_logs')
export class StaffAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  actorId: string;

  @Column()
  actorName: string; // Storing "SUPER_ADMIN John" or just their name/phone for quick view

  @Column()
  targetUserId: string;

  @Column({ type: 'enum', enum: UserRole })
  oldRole: UserRole;

  @Column({ type: 'enum', enum: UserRole })
  newRole: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}