// src/kyc/kyc.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Kyc } from './entities/kyc.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { CreateKycDto } from './dto/create-kyc.dto';
import { KycStatus } from './enums/kyc-status.enum';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createKycDto: CreateKycDto, userId: string): Promise<Kyc> {
    const existingKyc = await this.kycRepository.findOne({ where: { userId } });
    if (existingKyc) {
      throw new ConflictException('KYC submission already exists for this user.');
    }

    const newKyc = this.kycRepository.create({
      ...createKycDto,
      userId,
      status: KycStatus.PENDING,
    });

    return this.kycRepository.save(newKyc);
  }

  async findUserStatus(userId: string): Promise<Kyc> {
    const kyc = await this.kycRepository.findOne({ where: { userId } });
    if (!kyc) {
      throw new NotFoundException('No KYC record found for this user.');
    }
    return kyc;
  }

  /**
   * 🏛️ Unified KYC Review Route
   */
  async reviewKyc(kycId: string, status: KycStatus, reviewNotes?: string): Promise<Kyc> {
    if (status === KycStatus.PENDING) {
      throw new BadRequestException('Cannot review a KYC submission back to PENDING status.');
    }

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const kyc = await transactionalEntityManager.findOne(Kyc, {
        where: { id: kycId },
      });

      if (!kyc) {
        throw new NotFoundException('KYC submission record not found.');
      }

      // 🛑 State Machine Guard
      if (kyc.status !== KycStatus.PENDING) {
        throw new ConflictException('KYC already reviewed.');
      }

      kyc.status = status;
      kyc.reviewNotes = reviewNotes || null;
      const updatedKyc = await transactionalEntityManager.save(Kyc, kyc);

      // 🔄 Improvement 6: Standardized to explicit state-based status mapping context
      const userStatus = status === KycStatus.APPROVED 
        ? UserStatus.VERIFIED_KYC 
        : UserStatus.PENDING_KYC;
      
      await transactionalEntityManager.update(User, kyc.userId, {
        status: userStatus,
      });

      return updatedKyc;
    });
  }

  // 🔍 Task 4.1: List all pending KYC applications
  async getPending(): Promise<Kyc[]> {
    return this.kycRepository.find({
      where: { status: KycStatus.PENDING },
    });
  }

  // 🔄 Task 4.2: Approve KYC Submission & Promote User Status (Atomic Transaction)
  async approve(kycId: string): Promise<Kyc> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const kyc = await transactionalEntityManager.findOne(Kyc, {
        where: { id: kycId },
      });

      if (!kyc) {
        throw new NotFoundException(`KYC record with ID ${kycId} not found`);
      }

      // 🛑 State Machine Guard
      if (kyc.status !== KycStatus.PENDING) {
        throw new ConflictException('KYC already reviewed.');
      }

      kyc.status = KycStatus.APPROVED;
      const updatedKyc = await transactionalEntityManager.save(Kyc, kyc);

      // 🔄 Improvement 6: Standardized reference mapping to prevent runtime integration bugs
      await transactionalEntityManager.update(User, kyc.userId, {
        status: UserStatus.VERIFIED_KYC,
      });

      return updatedKyc;
    });
  }

  // ❌ Task 4.3: Reject KYC Submission with Optional Review Notes
  async reject(kycId: string, reviewNotes?: string): Promise<Kyc> {
    const kyc = await this.kycRepository.findOne({
      where: { id: kycId },
    });

    if (!kyc) {
      throw new NotFoundException(`KYC record with ID ${kycId} not found`);
    }

    // 🛑 State Machine Guard
    if (kyc.status !== KycStatus.PENDING) {
      throw new ConflictException('KYC already reviewed.');
    }

    kyc.status = KycStatus.REJECTED;
    kyc.reviewNotes = reviewNotes || null;

    return this.kycRepository.save(kyc);
  }
}