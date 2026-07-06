import { User, UserStatus } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  phone: string;
  status: UserStatus; // Strongly typed to the state enum
  isActive: boolean;  // Added visibility flag
  createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      phone: user.phone,
      status: user.status,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}