import {
  formatSignedUsdtDelta,
  formatUsdt,
  parseSignedUsdtDelta,
  parseUsdt,
} from './usdt-money';

describe('USDT money primitives', () => {
  describe('parseUsdt', () => {
    it.each([
      ['1', 1_000_000n],
      ['1.1', 1_100_000n],
      ['1.12', 1_120_000n],
      ['1.123456', 1_123_456n],
      ['0.000001', 1n],
      ['100000', 100_000_000_000n],
      ['01', 1_000_000n],
      ['0001.500000', 1_500_000n],
    ])('%s parses to %s atomic units', (input, expected) => {
      expect(parseUsdt(input)).toBe(expected);
    });

    it.each([
      '1.1234560',
      '1.1234567',
      '1.',
      '.1',
      ' 1 ',
      '0',
      '-1',
      'abc',
      '',
      '.',
    ])('rejects invalid amount %j', (input) => {
      expect(() => parseUsdt(input)).toThrow();
    });
  });

  describe('formatUsdt', () => {
    it.each([
      [1_000_000n, '1'],
      [1_100_000n, '1.1'],
      [1_120_000n, '1.12'],
      [1_123_456n, '1.123456'],
      [1n, '0.000001'],
      [1_500_000n, '1.5'],
      [100_000_000_000n, '100000'],
    ])('formats %s atomic units as %s', (input, expected) => {
      expect(formatUsdt(input as never)).toBe(expected);
    });

    it('rejects zero', () => {
      expect(() => formatUsdt(0n as never)).toThrow();
    });

    it('rejects negative values', () => {
      expect(() => formatUsdt(-1n as never)).toThrow();
    });
  });

  describe('signed deltas', () => {
    it.each([
      ['0', 0n],
      ['-0', 0n],
      ['+0', 0n],
      ['-0.00', 0n],
      ['-0.000000', 0n],
      ['+1.5', 1_500_000n],
      ['-1.5', -1_500_000n],
      ['1.123456', 1_123_456n],
      ['-1.123456', -1_123_456n],
      ['01.500000', 1_500_000n],
    ])('%s parses to %s atomic units', (input, expected) => {
      expect(parseSignedUsdtDelta(input)).toBe(expected);
    });

    it.each([
      '1.1234560',
      '1.1234567',
      '1.',
      '.1',
      ' 1 ',
      '',
      '.',
      '--1',
      '++1',
      '+-1',
    ])('rejects invalid signed delta %j', (input) => {
      expect(() => parseSignedUsdtDelta(input)).toThrow();
    });

    it.each([
      [0n, '0'],
      [1_500_000n, '1.5'],
      [-1_500_000n, '-1.5'],
      [-1_000_000n, '-1'],
      [1_123_456n, '1.123456'],
    ])('formats %s as %s', (input, expected) => {
      expect(formatSignedUsdtDelta(input as never)).toBe(expected);
    });
  });

  describe('round-trip', () => {
    it.each([
      '1',
      '1.1',
      '1.12',
      '1.123456',
      '0.000001',
      '01',
      '0001.500000',
      '100000',
    ])('preserves canonical value for %j', (input) => {
      const atomicUnits = parseUsdt(input);
      const formatted = formatUsdt(atomicUnits);
      expect(parseUsdt(formatted)).toBe(atomicUnits);
    });
  });
});
