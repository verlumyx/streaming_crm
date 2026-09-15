const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Hoy a medianoche local (las fechas del dominio son fechas de calendario). */
function hoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Días enteros entre dos fechas (`a - b`). */
export function diasEntre(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** `14 sep 2026` — fecha corta con mes abreviado en español. */
export function fmtFecha(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date.length === 10 ? `${date}T00:00:00` : date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Meses (aprox.) transcurridos desde una fecha hasta hoy, mínimo 1. */
export function mesesDesde(fecha: string | Date): number {
  return Math.max(1, Math.round(diasEntre(hoy(), new Date(fecha)) / 30));
}
