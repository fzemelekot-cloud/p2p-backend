import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { WalletModule } from '../wallet/wallet.module'; // ◄── Imported to allow balance verification

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    WalletModule, // ◄── Gives our service structural access to wallet features
  ],
  controllers: [OffersController], // ◄── Registers the route entry points
  providers: [OffersService],
  exports: [OffersService, TypeOrmModule],
})
export class OffersModule {}