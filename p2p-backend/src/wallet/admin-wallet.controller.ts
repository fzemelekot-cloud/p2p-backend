import { Controller, Patch, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard) // Resolves authentication first, then evaluates enterprise RBAC rules
@Roles(UserRole.FINANCE, UserRole.SUPER_ADMIN) // Restricted specifically to Finance and Super Admin layers
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * 👑 PATCH /admin/withdrawals/:id/approve
   * Admin processing flow to finalize and unlock an asset request.
   */
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveWithdrawal(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.id || req.user.userId;
    return await this.walletService.approveWithdrawal(id, adminId);
  }

  /**
   * 👑 PATCH /admin/withdrawals/:id/reject
   * Admin processing flow to cancel and refund an asset request.
   */
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectWithdrawal(
    @Param('id') id: string,
    @Req() req: any,
    @Body('reason') reason: string,
  ) {
    const adminId = req.user.id || req.user.userId;
    return await this.walletService.rejectWithdrawal(id, adminId, reason);
  }
}