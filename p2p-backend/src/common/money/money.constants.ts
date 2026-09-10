export const USDT_DECIMALS = 6 as const;
export const USDT_ATOMIC_UNITS = 1_000_000n;

// Business-risk policy defaults.
// These are NOT enforced by the low-level monetary parser.
export const MIN_TRANSACTION_AMOUNT_USDT = '1';
export const MAX_TRANSACTION_AMOUNT_USDT = '100000';
