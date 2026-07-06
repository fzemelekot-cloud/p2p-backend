import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) // Strict master administration access
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.findAllForAdmin();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.usersService.findOneForAdmin(id);
  }

  @Patch(':id/ban')
  async banUser(@Param('id') id: string): Promise<User> {
    return this.usersService.setBanStatus(id, true);
  }

  @Patch(':id/unban')
  async unbanUser(@Param('id') id: string): Promise<User> {
    return this.usersService.setBanStatus(id, false);
  }
}