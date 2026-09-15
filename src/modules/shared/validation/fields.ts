import { z } from 'zod';

/** First value when a query param arrives repeated (`?a=1&a=2`). */
const firstValue = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const requiredUuid = (message = 'El identificador no es válido.') => z.uuid({ message });

export const requiredText = (label: string, max: number) =>
  z
    .string({ message: `${label} es obligatorio.` })
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} no puede superar ${max} caracteres.`);

/** Optional text from a form: `''` / missing → `null`. */
export const optionalText = (label: string, max?: number) => {
  const base = z.string().trim();
  const bounded = max ? base.max(max, `${label} no puede superar ${max} caracteres.`) : base;
  return bounded.optional().transform((v) => (v ? v : null));
};

/** Optional email from a form: `''` / missing → `null`. */
export const optionalEmail = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `El correo no puede superar ${max} caracteres.`)
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, { message: 'El correo no es válido.' })
    .transform((v) => (v ? v : null));

/** Optional text filter from `searchParams`: empty → `undefined`, never throws. */
export const optionalFilter = z
  .preprocess(firstValue, z.string().trim().optional())
  .catch(undefined)
  .transform((v) => (v ? v : undefined));

/** Optional enum filter from `searchParams`: unknown values are ignored. */
export const optionalEnumFilter = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(firstValue, z.enum(values).optional()).catch(undefined);

export const limitParam = (fallback = 20, max = 100) =>
  z.preprocess(firstValue, z.coerce.number().int().min(1).max(max)).catch(fallback);

export const offsetParam = () => z.preprocess(firstValue, z.coerce.number().int().min(0)).catch(0);

/** Optional ISO date (`YYYY-MM-DD`) from `searchParams`: invalid values are ignored. */
export const optionalDateParam = z.preprocess(firstValue, z.iso.date().optional()).catch(undefined);

/** `?searched=1` flag used by reports that don't query until the user presses Buscar. */
export const searchedParam = z
  .preprocess(firstValue, z.enum(['1', 'true']).optional())
  .catch(undefined)
  .transform((v) => v !== undefined);
