import { describe, expect, it } from 'vitest';
import { addMonths, money } from '@/lib/format';

describe('money', () => {
  it('keeps the cents of a decimal amount', () => {
    expect(money(5.4)).toBe('$5,40');
    expect(money('5.40')).toBe('$5,40');
    expect(money('1234.05')).toBe('$1.234,05');
  });

  it('omits decimals for whole amounts', () => {
    expect(money('5.00')).toBe('$5');
    expect(money(12500)).toBe('$12.500');
  });

  it('treats missing amounts as zero', () => {
    expect(money(null)).toBe('$0');
    expect(money(undefined)).toBe('$0');
  });
});

describe('addMonths', () => {
  it('keeps the same day of the month', () => {
    expect(addMonths('2026-09-16', 1)).toBe('2026-10-16');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('uses the last day when the target month is shorter', () => {
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-29', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });
});
