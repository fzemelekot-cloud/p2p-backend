export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT', // Buyer created order, escrow held, waiting for fiat transfer
  MARKED_PAID = 'MARKED_PAID',         // Buyer clicked "I have paid", waiting for seller confirmation
  DISPUTED = 'DISPUTED',               // Timer expired or seller claimed non-receipt; admin locked
  COMPLETED = 'COMPLETED',             // Seller confirmed or admin ruled; USDT released to buyer
  CANCELLED = 'CANCELLED',             // Order timed out or aborted before payment was marked
}