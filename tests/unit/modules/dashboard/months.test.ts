import { describe, expect, it } from 'vitest';
import { roundHalfAwayFromZero, shiftMonth } from '@/modules/dashboard/domain/months';

describe('shiftMonth', () => {
  it('returns calendar month windows without day overflow', () => {
    expect(shiftMonth('2026-03-31', -1)).toMatchObject({ key: '2026-02', from: '2026-02-01', to: '2026-02-28' });
    expect(shiftMonth('2026-01-15', -1)).toMatchObject({ key: '2025-12', from: '2025-12-01', to: '2025-12-31' });
    expect(shiftMonth('2024-09-14', -7)).toMatchObject({ key: '2024-02', to: '2024-02-29' });
  });
});

describe('roundHalfAwayFromZero', () => {
  it('rounds .5 away from zero like PHP round()', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(12.345, 1)).toBe(12.3);
    expect(roundHalfAwayFromZero(-33.35, 1)).toBe(-33.4);
  });
});
