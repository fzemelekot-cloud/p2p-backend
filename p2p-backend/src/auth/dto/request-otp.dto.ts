import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsString({ message: 'Phone must be a valid text string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Length(9, 15, { message: 'Phone number must be between 9 and 15 characters' })
  phone: string;
}