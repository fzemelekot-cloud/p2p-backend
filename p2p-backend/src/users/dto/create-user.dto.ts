import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Phone must be a valid text string' })
  @IsNotEmpty({ message: 'Phone number cannot be left blank' })
  @Length(9, 15, { message: 'Phone number must be between 9 and 15 characters' })
  phone: string;
}