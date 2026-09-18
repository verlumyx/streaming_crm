/**
 * The bolívar rate the assistant may quote with.
 *
 * Two rules shape everything here. A rate the admin stopped updating is worse than no rate at all,
 * so it expires on its own; and the model never multiplies — prices in bolívares are computed here
 * and handed to it as data, the same way every other number it says comes from a tool.
 */

/** Past this age the stored rate stops being usable: nobody should quote yesterday's bolívares. */
export const EXCHANGE_RATE_MAX_AGE_HOURS = 24;

const HOUR_MS = 3_600_000;

export type ExchangeRateStatus = {
  /** Bolívares per dollar. */
  rate: number;
  updatedAt: Date;
  /** Older than `EXCHANGE_RATE_MAX_AGE_HOURS`: the admin configured it but let it go stale. */
  stale: boolean;
};

type RateSettings = { exchangeRate: string | null; exchangeRateUpdatedAt: Date | null };

/** `null` when the company simply does not quote in bolívares. */
export function resolveExchangeRate(settings: RateSettings, now: Date): ExchangeRateStatus | null {
  if (settings.exchangeRate === null || settings.exchangeRateUpdatedAt === null) return null;

  const rate = Number(settings.exchangeRate);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  const ageHours = (now.getTime() - settings.exchangeRateUpdatedAt.getTime()) / HOUR_MS;
  return { rate, updatedAt: settings.exchangeRateUpdatedAt, stale: ageHours > EXCHANGE_RATE_MAX_AGE_HOURS };
}

/** The rate a turn may actually price with, or `null` — what the tools receive. */
export function usableExchangeRate(status: ExchangeRateStatus | null): number | null {
  return status && !status.stale ? status.rate : null;
}

/** Dollars → bolívares, rounded to cents. `null` rate in, `null` out: the caller omits the field. */
export function toBolivares(amountUsd: number, rate: number | null): number | null {
  if (rate === null) return null;
  return Math.round(amountUsd * rate * 100) / 100;
}

const decimal = (maximumFractionDigits: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits });

/** For the prompt and the console: `240,50`. Rates keep up to four decimals, amounts two. */
export const formatRate = (value: number) => decimal(4).format(value);
export const formatBolivares = (value: number) => decimal(2).format(value);
