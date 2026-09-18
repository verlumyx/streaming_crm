/**
 * Gemini accepts an OpenAPI 3.0 subset as a function declaration's parameters and rejects the JSON
 * Schema keywords Zod emits, so they are stripped here — right before the request leaves, never in
 * the tool definition, which stays provider-agnostic.
 *
 * Kept out of the client so a schema assertion does not have to drag the vendor SDK into the test.
 */

const UNSUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$ref',
  '$defs',
  'additionalProperties',
  'const',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'patternProperties',
]);

export function sanitizeForGemini(value: unknown): Record<string, unknown> {
  return clean(value) as Record<string, unknown>;
}

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value === null || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    out[key] = clean(child);
  }
  return out;
}
