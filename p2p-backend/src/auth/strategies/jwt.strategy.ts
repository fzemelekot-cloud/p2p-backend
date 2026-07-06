import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;   // Canonical UUID Primary Key
  phone: string; // Informational metadata
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // Optimized primary key index hit-test
    const user = await this.usersService.findById(payload.sub);

    // Guard A: Verify user exists in the system
    if (!user) {
      throw new UnauthorizedException('Authentication failed: User no longer exists.');
    }

    // Guard B: Verify user has not been deactivated or suspended
    if (!user.isActive) {
      throw new UnauthorizedException('Authentication failed: User account is inactive.');
    }

    // Guard C: Check for active fraud/compliance bans
    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Authentication failed: This account has been banned.');
    }

    // Pass the complete fresh database state down to request.user
    return { 
      id: user.id, 
      phone: user.phone, 
      status: user.status,
      role: user.role,
    };
  }
}