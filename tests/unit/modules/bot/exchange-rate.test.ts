import { describe, expect, it } from 'vitest';
import {
  EXCHANGE_RATE_MAX_AGE_HOURS,
  resolveExchangeRate,
  toBolivares,
  usableExchangeRate,
} from '@/modules/bot/domain/exchange-rate';

const NOW = new Date('2026-09-18T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

describe('resolveExchangeRate', () => {
  it('returns nothing when the company does not quote in bolívares', () => {
    expect(resolveExchangeRate({ exchangeRate: null, exchangeRateUpdatedAt: null }, NOW)).toBeNull();
  });

  it('reads a fresh rate', () => {
    const status = resolveExchangeRate(
      { exchangeRate: '240.5000', exchangeRateUpdatedAt: hoursAgo(3) },
      NOW,
    );

    expect(status).toMatchObject({ rate: 240.5, stale: false });
  });

  it('marks a rate older than the max age as stale', () => {
    const status = resolveExchangeRate(
      { exchangeRate: '240.5000', exchangeRateUpdatedAt: hoursAgo(EXCHANGE_RATE_MAX_AGE_HOURS + 1) },
      NOW,
    );

    expect(status).toMatchObject({ rate: 240.5, stale: true });
  });

  it('keeps a rate that is exactly at the limit', () => {
    const status = resolveExchangeRate(
      { exchangeRate: '240.5000', exchangeRateUpdatedAt: hoursAgo(EXCHANGE_RATE_MAX_AGE_HOURS) },
      NOW,
    );

    expect(status?.stale).toBe(false);
  });

  it('ignores a rate that was never stamped, and a junk value', () => {
    expect(resolveExchangeRate({ exchangeRate: '240.0000', exchangeRateUpdatedAt: null }, NOW)).toBeNull();
    expect(resolveExchangeRate({ exchangeRate: 'x', exchangeRateUpdatedAt: hoursAgo(1) }, NOW)).toBeNull();
    expect(resolveExchangeRate({ exchangeRate: '0', exchangeRateUpdatedAt: hoursAgo(1) }, NOW)).toBeNull();
  });
});

describe('usableExchangeRate', () => {
  it('hands the tools a rate only while it is fresh', () => {
    const fresh = { rate: 240.5, updatedAt: hoursAgo(1), stale: false };
    const stale = { rate: 240.5, updatedAt: hoursAgo(48), stale: true };

    expect(usableExchangeRate(fresh)).toBe(240.5);
    expect(usableExchangeRate(stale)).toBeNull();
    expect(usableExchangeRate(null)).toBeNull();
  });
});

describe('toBolivares', () => {
  it('converts and rounds to cents', () => {
    expect(toBolivares(5, 240.5)).toBe(1202.5);
    expect(toBolivares(3.33, 240.4567)).toBe(800.72);
  });

  it('returns nothing without a rate, so the caller omits the field', () => {
    expect(toBolivares(5, null)).toBeNull();
  });
});
