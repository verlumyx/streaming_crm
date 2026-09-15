/**
 * Deriva un código visual estable (color de marca + iniciales) a partir del
 * nombre de un servicio/plataforma real. Permite mantener el estilo del
 * dashboard sin depender de un catálogo de marcas codificado a mano.
 */

const PALETTE = [
  '#e50914',
  '#1942d6',
  '#6b21d6',
  '#1aa64b',
  '#00a8e1',
  '#f01616',
  '#f47521',
  '#0064ff',
  '#1c1c1e',
  '#0f766e',
  '#be185d',
  '#b45309',
];

function hash(value: string): number {
  let h = 0;
  for (const char of value) {
    h = (h * 31 + char.charCodeAt(0)) >>> 0;
  }
  return h;
}

export interface PlatformVisual {
  color: string;
  short: string;
}

export function platformVisual(name: string): PlatformVisual {
  const clean = name.trim();
  const color = PALETTE[hash(clean) % PALETTE.length];

  const short = clean
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return { color, short: short || '?' };
}
