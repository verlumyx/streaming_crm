import type { z } from 'zod';

/**
 * Zod issues → `fieldErrors` keyed by dotted path (`lines.0.category`), so nested fields
 * (arrays of lines, profiles…) can show their message next to the right input.
 */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Parses a JSON string coming from a hidden form input; leaves other values untouched. */
export function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
