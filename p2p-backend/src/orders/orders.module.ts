import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from '../admin/admin-orders.controller';
import { Order } from './entities/order.entity';
import { OffersModule } from '../offers/offers.module'; // ◄── Keep this for Liquidity access

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    OffersModule, // ◄── Necessary for matchOrder() to function
  ],
  controllers: [
    OrdersController, 
    AdminOrdersController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}