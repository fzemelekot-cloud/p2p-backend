import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { AdminKycController } from './admin-kyc.controller'; // ◄── 1. Imported the new admin controller
import { Kyc } from './entities/kyc.entity';
import { User } from '../users/entities/user.entity'; // ◄── Retained User entity import

@Module({
  imports: [
    TypeOrmModule.forFeature([Kyc, User]), // ◄── Retained both entities for database access
  ],
  controllers: [
    KycController, 
    AdminKycController, // ◄── 2. Registered here to expose the admin routing paths
  ],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}