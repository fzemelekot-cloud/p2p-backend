import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString({ message: 'Phone must be a valid text string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Length(9, 15, { message: 'Phone number must be between 9 and 15 characters' })
  phone: string;

  @IsString({ message: 'OTP code must be a string' })
  @IsNotEmpty({ message: 'OTP code is required' })
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;
}