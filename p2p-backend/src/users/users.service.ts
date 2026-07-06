import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserRole } from './entities/user.entity'; // 🔄 Added UserRole import
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private walletService: WalletService,
  ) {}

  // ==========================================
  // CORE USER & AUTHENTICATION METHODS
  // ==========================================

  async create(phone: string): Promise<User> {
    const existingUser = await this.userRepo.findOne({ where: { phone } });
    if (existingUser) {
      throw new ConflictException('This phone number is already registered in our system');
    }

    const user = this.userRepo.create({ phone });
    const savedUser = await this.userRepo.save(user);

    // ⚡ Wallet Creation Strategy Chain
    await this.walletService.createWallet(savedUser.id);

    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepo.find();
  }

  async findOneByPhone(phone: string): Promise<User | null> {
    return await this.userRepo.findOne({ where: { phone } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepo.findOne({ where: { id } });
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.status = status;
    return await this.userRepo.save(user);
  }

  // ==========================================
  // OPERATIONAL ADMIN TOOLS (GROUP A)
  // ==========================================

  // ✅ Task 6: Direct Role Promotion Engine
  async updateRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User account not found.');
    }
    
    user.role = role;
    return this.userRepo.save(user);
  }

  // Get all users ordered by creation date for admin dashboard review
  async findAllForAdmin(): Promise<User[]> {
    return this.userRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // Explicit admin fetch with strict error checking
  async findOneForAdmin(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  // Update ban status safely with historical state restoration guards
  async setBanStatus(id: string, shouldBan: boolean): Promise<User> {
    const user = await this.findOneForAdmin(id);

    if (shouldBan) {
      if (user.status === UserStatus.BANNED) {
        throw new BadRequestException('User is already banned');
      }
      // 1. Capture a snapshot of their current state before changing it
      user.previousStatus = user.status;
      user.status = UserStatus.BANNED;
    } else {
      if (user.status !== UserStatus.BANNED) {
        throw new BadRequestException('User is not currently banned');
      }
      
      // 2. Revert to their precise previous state (fallback to PENDING_KYC if empty)
      user.status = user.previousStatus || UserStatus.PENDING_KYC;
      
      // 3. Wipe the snapshot slot clean post-restoration
      user.previousStatus = null; 
    }

    return this.userRepo.save(user);
  }
}