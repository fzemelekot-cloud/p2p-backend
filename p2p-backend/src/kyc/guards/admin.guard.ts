import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // ◄── Automatically populated by JwtAuthGuard

    if (!user) {
      return false;
    }

    // Strict validation check: block anyone who is not explicitly an ADMIN
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied: Administrative privileges required');
    }

    return true;
  }
}