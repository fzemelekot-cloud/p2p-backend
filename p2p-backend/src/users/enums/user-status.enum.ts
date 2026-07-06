export enum UserStatus {
  PENDING_KYC = 'PENDING_KYC',
  VERIFIED_KYC = 'VERIFIED_KYC', // ⚡️ Updated from 'VERIFIED' to match your database
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
}