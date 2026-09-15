/** `$1.234,5` — bare dollar sign, es-ES grouping, 0–2 decimals. */
export function money(n: number | string | null | undefined): string {
  const value = Number(n ?? 0);
  return '$' + value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** `+12,5%` / `-3%`. */
export function percent(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const value = Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  return `${n > 0 ? '+' : ''}${value}%`;
}

/** ISO date (`2026-09-14`) or ISO datetime → `14/09/2026`. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date =
    typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `2026-09-14` for today in the app timezone (dates in the domain are calendar dates, not instants). */
export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function diffInDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** `$12.500` — pesos chilenos sin decimales (`es-CL`). */
export function clp(n: number | string | null | undefined): string {
  return '$' + Number(n ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

/** `1.234,50` — two fixed decimals (es-VE grouping), used by reports and ledger amounts. */
export function decimal(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
