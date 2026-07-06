// src/staff/staff.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { User } from '../users/entities/user.entity';
import { StaffAuditLog } from './entities/staff-audit-log.entity'; // 👈 Import new entity
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StaffAuditLog]), // 👈 Add StaffAuditLog here
    UsersModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}