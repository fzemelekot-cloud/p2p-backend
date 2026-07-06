// src/staff/staff.controller.ts
import { Controller, Get, Patch, Param, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) 
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async listStaff() {
    return this.staffService.listStaff();
  }

  // 🔄 Updated: Extracts both caller ID and role to block self-modification exploits
  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async updateStaffRole(
    @Param('id') id: string, 
    @Body() updateRoleDto: UpdateRoleDto, 
    @Req() req: any
  ) {
    const callerId = req.user.id;     // 👈 Extract caller's unique DB primary key
    const callerRole = req.user.role;   // Extract caller's tier metadata
    
    return this.staffService.updateStaffRole(callerId, callerRole, id, updateRoleDto.role);
  }

  @Patch(':id/promote')
  @HttpCode(HttpStatus.OK)
  async promoteStaff(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.staffService.promoteToStaff(id, role);
  }

  @Patch(':id/demote')
  @HttpCode(HttpStatus.OK)
  async demoteStaff(@Param('id') id: string) {
    return this.staffService.demoteToUser(id);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendStaff(@Param('id') id: string) {
    return this.staffService.suspendStaff(id);
  }

  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateStaff(@Param('id') id: string) {
    return this.staffService.reactivateStaff(id);
  }
}