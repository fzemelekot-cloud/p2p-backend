import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Extract allowed roles from the route metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific roles are required, let the request pass through
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, secret) as any;
      
      // Attach user context to the request object
      request.user = decoded;

      // 2. Authorization Gate: Check if the user's role satisfies route requirements
      // System Admins bypass all restrictions automatically
      if (decoded.role === UserRole.ADMIN) {
        return true;
      }

      const hasRequiredRole = requiredRoles.includes(decoded.role);
      if (!hasRequiredRole) {
        throw new ForbiddenException(`Access denied: Requires one of the following roles: [${requiredRoles.join(', ')}]`);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired security token');
    }
  }
}