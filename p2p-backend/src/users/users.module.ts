import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller'; // ◄── 1. Import the new controller
import { User } from './entities/user.entity';
import { WalletModule } from '../wallet/wallet.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    WalletModule,
  ],
  controllers: [
    UsersController, 
    AdminUsersController, // ◄── 2. Add it here to register the routes
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}