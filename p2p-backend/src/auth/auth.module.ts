import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Otp } from './entities/otp.entity';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // 1. Mount the Otp database tracking schema for feature ingestion
    TypeOrmModule.forFeature([Otp]),
    
    // 2. Share user scanning layers without rewriting business rules
    UsersModule,

    // 3. Mount Passport configuration layer for strategy lifecycle management
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // 4. Dynamically sign JWT access sessions using configurations from your .env file
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // Access tokens remain valid for exactly 1 day
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}