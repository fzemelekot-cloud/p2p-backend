import { Controller, Get, Post, Body, UseGuards, Req, NotFoundException, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * 💳 GET /wallet
   * Securely reads personal wallet profile data, including frozen escrow metrics.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getWallet(@Req() req: any) {
    const userId = req.user.id || req.user.userId; 

    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('No wallet found for this user account');
    }

    return {
      balance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      depositAddress: wallet.tronDepositAddress || wallet.depositAddress,
    };
  }

  /**
   * 🔑 GET /wallet/deposit-address
   * Dynamic Hierarchical Deterministic (HD) TRON wallet derivation gateway.
   */
  @UseGuards(JwtAuthGuard)
  @Get('deposit-address')
  async getDepositAddress(@Req() req: any) {
    const userId = req.user.id || req.user.userId;
    return await this.walletService.getOrCreateDepositAddress(userId);
  }

  /**
   * ⚠️ POST /wallet/simulate-deposit (DEVELOPMENT ONLY)
   * Environment-gated mock credit flow.
   */
  @UseGuards(JwtAuthGuard)
  @Post('simulate-deposit')
  async simulateDeposit(@Req() req: any, @Body('amount') amount: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Simulation endpoints are disabled in production environments.');
    }

    const userId = req.user.id || req.user.userId;
    const updatedWallet = await this.walletService.simulateDeposit(userId, amount);
    return {
      balance: updatedWallet.balance,
    };
  }

  /**
   * ⚠️ POST /wallet/simulate-debit (DEVELOPMENT ONLY)
   * Environment-gated mock spend flow.
   */
  @UseGuards(JwtAuthGuard)
  @Post('simulate-debit')
  async simulateDebit(@Req() req: any, @Body('amount') amount: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Simulation endpoints are disabled in production environments.');
    }

    const userId = req.user.id || req.user.userId;
    const updatedWallet = await this.walletService.debitBalance(userId, amount);
    return {
      balance: updatedWallet.balance,
    };
  }

  /**
   * 📤 User Initiative Flow: Create a Withdrawal Request
   * POST /wallet/withdrawals
   */
  @UseGuards(JwtAuthGuard)
  @Post('withdrawals')
  @HttpCode(HttpStatus.CREATED)
  async createWithdrawal(
    @Req() req: any,
    @Body() body: { targetAddress: string; amount: number },
  ) {
    const userId = req.user.id || req.user.userId;
    return await this.walletService.requestWithdrawal(
      userId,
      body.targetAddress,
      body.amount,
    );
  }
}