// src/auth/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Extract the allowed roles assigned via the @Roles(...) decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are configured on this route, bypass verification
    if (!requiredRoles) {
      return true;
    }

    // 2. Fetch the request object and pull the authenticated user profile (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: Missing authentication context');
    }

    // 3. Match user's role against the endpoint's access permission matrix
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied: Required roles: [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}