import {
  USDT_ATOMIC_UNITS,
  USDT_DECIMALS,
} from './money.constants';

export type UsdtAmount = bigint & {
  readonly __brand: 'UsdtAmount';
};

export type SignedUsdtDelta = bigint & {
  readonly __brand: 'SignedUsdtDelta';
};

const USDT_AMOUNT_PATTERN = /^(\d+)(?:\.(\d+))?$/;
const SIGNED_USDT_DELTA_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

function parseDecimalParts(
  value: string,
  pattern: RegExp,
): { sign: string; wholePart: string; fractionPart: string } {
  if (typeof value !== 'string') {
    throw new Error('USDT amount must be a decimal string');
  }

  const match = value.match(pattern);

  if (!match) {
    throw new Error('Invalid USDT amount');
  }

  return {
    sign: match[1] ?? '',
    wholePart: match[2] ?? match[1],
    fractionPart: match[3] ?? match[2] ?? '',
  };
}

function decimalPartsToAtomicUnits(
  wholePart: string,
  fractionPart: string,
): bigint {
  if (fractionPart.length > USDT_DECIMALS) {
    throw new Error(
      `USDT amount cannot have more than ${USDT_DECIMALS} decimal places`,
    );
  }

  const normalizedFraction = fractionPart.padEnd(
    USDT_DECIMALS,
    '0',
  );

  return (
    BigInt(wholePart) * USDT_ATOMIC_UNITS +
    BigInt(normalizedFraction || '0')
  );
}

export function parseUsdt(value: string): UsdtAmount {
  const { wholePart, fractionPart } = parseDecimalParts(
    value,
    USDT_AMOUNT_PATTERN,
  );

  const atomicUnits = decimalPartsToAtomicUnits(
    wholePart,
    fractionPart,
  );

  if (atomicUnits <= 0n) {
    throw new Error('USDT amount must be greater than zero');
  }

  return atomicUnits as UsdtAmount;
}

export function parseSignedUsdtDelta(value: string): SignedUsdtDelta {
  const { sign, wholePart, fractionPart } = parseDecimalParts(
    value,
    SIGNED_USDT_DELTA_PATTERN,
  );

  const atomicUnits = decimalPartsToAtomicUnits(
    wholePart,
    fractionPart,
  );

  if (sign === '-') {
    return (-atomicUnits) as SignedUsdtDelta;
  }

  return atomicUnits as SignedUsdtDelta;
}

export function formatUsdt(value: UsdtAmount): string {
  if (value <= 0n) {
    throw new Error('USDT amount must be greater than zero');
  }

  return formatAtomicUnits(value);
}

export function formatSignedUsdtDelta(value: SignedUsdtDelta): string {
  return formatSignedAtomicUnits(value);
}

function formatAtomicUnits(value: bigint): string {
  const wholePart = value / USDT_ATOMIC_UNITS;
  const fractionalPart = value % USDT_ATOMIC_UNITS;

  if (fractionalPart === 0n) {
    return wholePart.toString();
  }

  const fraction = fractionalPart
    .toString()
    .padStart(USDT_DECIMALS, '0')
    .replace(/0+$/, '');

  return `${wholePart}.${fraction}`;
}

function formatSignedAtomicUnits(value: bigint): string {
  if (value === 0n) {
    return '0';
  }

  if (value < 0n) {
    return `-${formatAtomicUnits(-value)}`;
  }

  return formatAtomicUnits(value);
}
