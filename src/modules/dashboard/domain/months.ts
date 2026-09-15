const pad = (n: number) => String(n).padStart(2, '0');

export const MONTH_SHORT_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;
export const MONTH_LONG_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export type MonthWindow = { key: string; year: number; month: number; from: string; to: string };

/** Calendar month shifted `delta` months from the month of `today` (no day overflow). Dates are ISO `YYYY-MM-DD`. */
export function shiftMonth(today: string, delta: number): MonthWindow {
  const [y, m] = today.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + delta, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    key: `${year}-${pad(month)}`,
    year,
    month,
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export { roundHalfAwayFromZero } from '@/modules/shared/math';
