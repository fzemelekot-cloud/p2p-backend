import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard) // Resolves authentication context first, then evaluates specific role privileges
@Roles(UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN) // Grants explicit access to support reps and managers
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ==========================================
  // QUEUE READ ENGINES
  // ==========================================

  @Get()
  async findAllDisputes() {
    return await this.ordersService.findAllDisputesForAdmin();
  }

  @Get(':id')
  async findOneDispute(@Param('id') id: string) {
    return await this.ordersService.findOneDisputeForAdmin(id);
  }

  // ==========================================
  // RESOLUTION WRITE ENGINES
  // ==========================================

  @Patch(':id/release')
  async resolveWithRelease(@Param('id') id: string) {
    return await this.ordersService.adminResolveDispute(id, 'release');
  }

  @Patch(':id/refund')
  async resolveWithRefund(@Param('id') id: string) {
    return await this.ordersService.adminResolveDispute(id, 'refund');
  }
}