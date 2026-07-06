import { Controller, Post, Body, Get, Patch, Param, UseGuards } from '@nestjs/common'; // ◄── Add Patch and Param
import { KycService } from './kyc.service';
import { CreateKycDto } from './dto/create-kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KycStatus } from './enums/kyc-status.enum';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createKycDto: CreateKycDto,
    @CurrentUser() user: { id: string; phone: string },
  ) {
    return this.kycService.create(createKycDto, user.id);
  }

  // Open src/kyc/kyc.controller.ts and update the getStatus method:

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: { id: string; phone: string }) {
    const kyc = await this.kycService.findUserStatus(user.id);
    
    // 🔒 FIX ISSUE 3: Whitelist only safe fields for the end-user response
    return {
      status: kyc.status,
      // Only include reviewNotes if they actually exist (prevents sending "reviewNotes": null)
      ...(kyc.reviewNotes ? { reviewNotes: kyc.reviewNotes } : {}),
    };
  }
  
  // 🛠️ Simulated Admin Route to review submissions and update User status
  @Patch(':id/review')
  async review(
    @Param('id') kycId: string,
    @Body() body: { status: KycStatus; reviewNotes?: string },
  ) {
    return this.kycService.reviewKyc(kycId, body.status, body.reviewNotes);
  }
}