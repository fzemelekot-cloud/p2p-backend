import { Controller, UseGuards, Get, Patch, Param, Body } from '@nestjs/common';
import { KycService } from './kyc.service';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { Kyc } from './entities/kyc.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard) // Authenticates via JWT first, then checks dynamic enterprise roles
@Roles(UserRole.COMPLIANCE, UserRole.SUPER_ADMIN) // Open specifically to Minor Admin (Compliance) & Full Master Admin
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  // 🔍 GET /admin/kyc/pending
  @Get('pending')
  async getPending(): Promise<Kyc[]> {
    return this.kycService.getPending();
  }

  // 🔄 PATCH /admin/kyc/:id/approve
  @Patch(':id/approve')
  async approve(@Param('id') id: string): Promise<Kyc> {
    return this.kycService.approve(id);
  }

  // ❌ PATCH /admin/kyc/:id/reject
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() reviewKycDto: ReviewKycDto,
  ): Promise<Kyc> {
    return this.kycService.reject(id, reviewKycDto.reviewNotes);
  }
}