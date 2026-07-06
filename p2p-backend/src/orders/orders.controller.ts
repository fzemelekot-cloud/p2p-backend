// src/orders/orders.controller.ts
import { Controller, Post, Body, Patch, Param, UseGuards, Req, Get, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MatchOrderDto } from './dto/match-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. Dashboard: Get current logged-in user's order history
  @Get('my')
  async findMyOrders(@Request() req: any) {
    return await this.ordersService.findUserOrders(req.user.id);
  }

  // 2. Fetching: Get detailed breakdown of a specific trade with ACL rules (Task 6)
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return await this.ordersService.findOrderDetails(
      id,
      req.user.id,
      req.user.role,
      req.user.isAdmin,
    );
  }

  @Post('match')
  async matchOrder(@Req() req: any, @Body() dto: MatchOrderDto) {
    return await this.ordersService.matchOrder(req.user.id, dto);
  }

  @Patch(':id/pay')
  async markAsPaid(@Req() req: any, @Param('id') id: string) {
    return await this.ordersService.markAsPaid(req.user.id, id);
  }

  @Patch(':id/release')
  async releaseEscrow(@Req() req: any, @Param('id') id: string) {
    return await this.ordersService.confirmReceiptAndRelease(req.user.id, id);
  }

  @Patch(':id/cancel')
  async cancelOrder(@Req() req: any, @Param('id') id: string) {
    return await this.ordersService.cancelOrder(req.user.id, id);
  }

  @Post(':id/dispute')
  async disputeOrder(@Req() req: any, @Param('id') id: string) {
    return await this.ordersService.fileDispute(req.user.id, id);
  }
}