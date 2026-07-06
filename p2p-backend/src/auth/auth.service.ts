import { Injectable, UnauthorizedException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Otp } from './entities/otp.entity';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Helper helper to hash OTP strings using SHA-256
  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async requestOtp(phone: string): Promise<{ message: string }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 1. Strict Cooldown Shield: Max 1 request per 60 seconds
    const recentOtp = await this.otpRepository.findOne({
      where: { phone, createdAt: MoreThan(oneMinuteAgo) },
    });
    if (recentOtp) {
      throw new HttpException(
        'Please wait 60 seconds before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Volumetric Burst Shield: Max 5 requests per hour
    const hourlyCount = await this.otpRepository.count({
      where: { phone, createdAt: MoreThan(oneHourAgo) },
    });
    if (hourlyCount >= 5) {
      throw new HttpException(
        'Too many OTP requests. Try again in an hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Generation of raw ephemeral secret token
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString(); 
    const hashedCode = this.hashOtp(rawCode);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // Expiration limit: exactly 5 minutes

    // 4. Save only the cryptographic representation to the database
    const otpRecord = this.otpRepository.create({
      phone,
      code: hashedCode,
      expiresAt,
    });
    await this.otpRepository.save(otpRecord);

    // Phase 1 Development Hook: Log raw token cleanly to your local runtime terminal console
    console.log(`\n==========================================`);
    console.log(`🔥 [SMS SIMULATOR] Outgoing OTP to ${phone}: ${rawCode}`);
    console.log(`==========================================\n`);

    return { message: 'Verification OTP code generated and transmitted successfully.' };
  }

  async verifyOtp(phone: string, code: string): Promise<{ accessToken: string }> {
    const now = new Date();
    const hashedCode = this.hashOtp(code);

    // 1. Scan for matching database footprint
    const otpRecord = await this.otpRepository.findOne({
      where: {
        phone,
        code: hashedCode,
        isUsed: false,
        expiresAt: MoreThan(now),
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid verification code or code has expired.');
    }

    // 2. Consume token immediately to lock out replay exploitation windows
    otpRecord.isUsed = true;
    await this.otpRepository.save(otpRecord);

    // 3. Strict Verification Boundary: Confirm actual user existence via UsersService
    const user = await this.usersService.findOneByPhone(phone);
    if (!user) {
      throw new NotFoundException('Account is not registered. Please complete registration first.');
    }

    // 4. Issue standard secure session signature string with Role contextual mapping
    const jwtPayload = { 
      sub: user.id, 
      phone: user.phone,
      role: user.role // ◄── Included role mapping configuration for RolesGuard tracking
    };
    const accessToken = this.jwtService.sign(jwtPayload);

    return { accessToken };
  }
}