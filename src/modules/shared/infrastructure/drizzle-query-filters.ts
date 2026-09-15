import type { SQL } from 'drizzle-orm';

/** Criteria map: one builder per filterable key. Keys MUST match `Search*Command.filters` keys. */
export type FilterMap = Record<string, (value: string) => SQL | undefined>;

/**
 * Turns a `filters` object into Drizzle conditions, skipping empty values.
 * Keys without a builder are ignored on purpose (unknown query params are harmless).
 */
export function applyFilters(map: FilterMap, filters: Record<string, unknown>): SQL[] {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue;
    const build = map[key];
    if (!build) continue;
    const condition = build(String(value));
    if (condition) conditions.push(condition);
  }

  return conditions;
}

/** `%value%` for ILIKE with `%`, `_` and `\\` escaped, so user input is matched literally. */
export function contains(value: string): string {
  return `%${value.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}
