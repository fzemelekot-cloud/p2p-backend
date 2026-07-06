// src/staff/dto/update-role.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'The operational role property is required.' })
  @IsEnum(UserRole, {
    message: `Role must be a valid system tier: ${Object.values(UserRole).join(', ')}`,
  })
  role: UserRole;
}