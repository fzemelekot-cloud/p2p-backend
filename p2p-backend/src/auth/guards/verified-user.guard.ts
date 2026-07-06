import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { UserStatus } from '../../users/enums/user-status.enum'; // Double check this path matches your project structure

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Populated by JwtAuthGuard

    if (!user) {
      return false;
    }

    // Checking the updated enum value perfectly synchronized with the database
    if (user.status !== UserStatus.VERIFIED_KYC) {
      throw new ForbiddenException(
        'Access denied: You must complete identity verification (KYC) before accessing trading features.',
      );
    }

    return true;
  }
}