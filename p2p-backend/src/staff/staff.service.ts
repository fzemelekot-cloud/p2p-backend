// src/staff/staff.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { StaffAuditLog } from './entities/staff-audit-log.entity'; // 👈 Import Audit Log entity
import { UsersService } from '../users/users.service';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StaffAuditLog) // 👈 Inject Audit Log Repository
    private readonly auditLogRepository: Repository<StaffAuditLog>,
    private readonly usersService: UsersService,
  ) {}

  // 🛡️ Task 6 - Improvement 1, 3, 4 & 5: Secure Assignment with Full Traceable Audit Logging
  async updateStaffRole(
    callerId: string, 
    callerRole: UserRole, 
    targetUserId: string, 
    newRole: UserRole
  ): Promise<{ message: string; userId: string; role: UserRole }> {
    // 1. Strict Identity Guard
    if (callerId === targetUserId) {
      throw new ForbiddenException('Security Violation: Operators are strictly prohibited from changing their own roles.');
    }

    // 2. Fetch the target user profile
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('Target user account not found.');
    }

    // Capture original role state for auditing
    const oldRole = targetUser.role;

    // If the role isn't changing, bypass mutation and logging to reduce clutter
    if (oldRole === newRole) {
      return {
        message: 'Role is already assigned to this value',
        userId: targetUserId,
        role: newRole,
      };
    }

    // 3. Strict Guard: Prevent non-SUPER_ADMINs from creating or elevating anyone to SUPER_ADMIN
    if (newRole === UserRole.SUPER_ADMIN && callerRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Privilege Escalation Denied: Only a SUPER_ADMIN can assign the SUPER_ADMIN role.');
    }

    // 4. Strict Guard: Prevent an ADMIN from modifying or demoting a SUPER_ADMIN account
    if (targetUser.role === UserRole.SUPER_ADMIN && callerRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access Denied: Standard ADMIN accounts cannot alter a SUPER_ADMIN profile.');
    }

    // 5. Business Rules Evaluation Matrix
    if (callerRole === UserRole.ADMIN) {
      const allowedRolesForAdmin = [
        UserRole.ADMIN,
        UserRole.FINANCE,
        UserRole.COMPLIANCE,
        UserRole.SUPPORT,
        UserRole.USER,
      ];

      if (!allowedRolesForAdmin.includes(newRole)) {
        throw new BadRequestException(`An ADMIN is not authorized to assign the role: ${newRole}`);
      }
    }

    // Fetch the caller details to extract an actionable descriptor name for the log entry
    const callerUser = await this.userRepository.findOne({ where: { id: callerId } });
    const actorDisplayName = callerUser ? `${callerRole} ${callerUser.phone || callerId}` : `${callerRole} ${callerId}`;

    // 6. Business logic validated completely -> Mutate entity
    await this.usersService.updateRole(targetUserId, newRole);

    // 📝 Improvement 5: Create immutable audit trail entry
    const auditRecord = this.auditLogRepository.create({
      actorId: callerId,
      actorName: actorDisplayName,
      targetUserId: targetUserId,
      oldRole: oldRole,
      newRole: newRole,
    });
    await this.auditLogRepository.save(auditRecord);

    // 🔄 Improvement 4: Return a structured operational payload
    return {
      message: 'Role updated successfully',
      userId: targetUserId,
      role: newRole,
    };
  }

  // ==========================================
  // EXISTING STAFF LAYER METHODS
  // ==========================================
  async listStaff(): Promise<User[]> {
    return this.userRepository.find({
      where: [
        { role: UserRole.ADMIN },
        { role: UserRole.COMPLIANCE },
        { role: UserRole.FINANCE },
        { role: UserRole.SUPPORT },
      ],
      select: {
        id: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async promoteToStaff(userId: string, targetRole: UserRole): Promise<User> {
    if (targetRole === UserRole.USER || targetRole === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Invalid target staff role conversion context.');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Target user account not found.');
    user.role = targetRole;
    return this.userRepository.save(user);
  }

  async demoteToUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Target staff account not found.');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Master Super Admin accounts cannot be demoted.');
    }
    user.role = UserRole.USER;
    return this.userRepository.save(user);
  }

  async suspendStaff(userId: string): Promise<User> {
    return this.usersService.setBanStatus(userId, true);
  }

  async reactivateStaff(userId: string): Promise<User> {
    return this.usersService.setBanStatus(userId, false);
  }
}