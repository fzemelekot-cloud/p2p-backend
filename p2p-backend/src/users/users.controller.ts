import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto'; // Import input validation DTO
import { UserResponseDto } from './dto/user-response.dto'; // Import output firewall DTO

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto.phone);
    return UserResponseDto.fromEntity(user); // Send data through the filter
  }

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(user => UserResponseDto.fromEntity(user)); // Clear all records through the filter
  }
}