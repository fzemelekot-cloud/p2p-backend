// src/wallet/enums/transaction-type.enum.ts
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  ESCROW_LOCK = 'ESCROW_LOCK',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  TRADE_SETTLEMENT = 'TRADE_SETTLEMENT',
  ESCROW_REFUND = 'ESCROW_REFUND', // ◄── Added for Task 4 cancellation ledger entries
}