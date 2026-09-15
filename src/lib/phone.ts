export interface CountryCode {
  name: string;
  dial: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: 'Venezuela', dial: '+58' },
  { name: 'Chile', dial: '+56' },
  { name: 'Colombia', dial: '+57' },
  { name: 'Argentina', dial: '+54' },
  { name: 'Perú', dial: '+51' },
  { name: 'México', dial: '+52' },
  { name: 'Ecuador', dial: '+593' },
  { name: 'Bolivia', dial: '+591' },
  { name: 'Paraguay', dial: '+595' },
  { name: 'Uruguay', dial: '+598' },
  { name: 'Panamá', dial: '+507' },
  { name: 'Costa Rica', dial: '+506' },
  { name: 'Guatemala', dial: '+502' },
  { name: 'Honduras', dial: '+504' },
  { name: 'Nicaragua', dial: '+505' },
  { name: 'El Salvador', dial: '+503' },
  { name: 'Rep. Dominicana', dial: '+1' },
  { name: 'Estados Unidos', dial: '+1' },
  { name: 'España', dial: '+34' },
  { name: 'Brasil', dial: '+55' },
];

export const DEFAULT_DIAL = '+58';

/**
 * Combine a country dial code and a local number into a single phone string.
 * Returns an empty string when no number is provided so optional phone fields
 * are not stored as a bare prefix.
 */
export function joinPhone(prefix: string, number: string): string {
  const trimmed = number.trim();

  return trimmed ? `${prefix} ${trimmed}`.trim() : '';
}

/**
 * Best-effort split of a stored phone into a known dial code prefix and the
 * remaining local number. Falls back to the default dial code when the stored
 * value has no recognizable prefix (e.g. legacy data).
 */
export function splitPhone(full: string | null | undefined): {
  prefix: string;
  number: string;
} {
  const value = (full ?? '').trim();

  if (value === '') {
    return { prefix: DEFAULT_DIAL, number: '' };
  }

  const dials = [...new Set(COUNTRY_CODES.map((c) => c.dial))].sort((a, b) => b.length - a.length);

  for (const dial of dials) {
    if (value.startsWith(dial)) {
      return { prefix: dial, number: value.slice(dial.length).trim() };
    }
  }

  return { prefix: DEFAULT_DIAL, number: value };
}

export function soloDigitos(tel: string): string {
  return tel.replace(/[^0-9]/g, '');
}

export function whatsappUrl(tel: string): string {
  return `https://wa.me/${soloDigitos(tel)}`;
}
