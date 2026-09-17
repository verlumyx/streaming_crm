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

/**
 * Normalize a stored phone (`+58 412 1234567`) or a raw channel id (`584121234567`) into E.164.
 * Returns null when the value cannot be a real number.
 *
 * A value with no recognizable country code is assumed to be local and gets `defaultDial`, so the
 * result is best-effort: it is used to *suggest* a client match, never to assert identity on its own.
 */
export function toE164(raw: string | null | undefined, defaultDial = DEFAULT_DIAL): string | null {
  const value = (raw ?? '').trim();
  const digits = soloDigitos(value);
  if (digits === '') return null;

  const isInternational =
    value.startsWith('+') || (digits.length >= 10 && knownDialDigits().some((dial) => digits.startsWith(dial)));
  // A local number carries the national trunk prefix (`0412…`), which the international form drops.
  const e164 = isInternational ? `+${digits}` : `${defaultDial}${stripTrunkPrefix(digits)}`;

  return e164.length >= 8 && e164.length <= 20 ? e164 : null;
}

function stripTrunkPrefix(digits: string): string {
  return digits.replace(/^0+/, '');
}

/** Country codes as bare digits, longest first, so `+593` wins over `+59`. */
function knownDialDigits(): string[] {
  return [...new Set(COUNTRY_CODES.map((c) => soloDigitos(c.dial)))].sort((a, b) => b.length - a.length);
}

/**
 * Compare a stored free-form phone against an E.164 number, ignoring formatting.
 * Requires at least 8 significant digits to overlap: matching on a short suffix would link
 * unrelated clients to a contact.
 */
export function matchesE164(stored: string | null | undefined, e164: string): boolean {
  const a = stripTrunkPrefix(soloDigitos(stored ?? ''));
  const b = stripTrunkPrefix(soloDigitos(e164));
  if (a.length < 8 || b.length < 8) return false;

  return a === b || a.endsWith(b) || b.endsWith(a);
}
