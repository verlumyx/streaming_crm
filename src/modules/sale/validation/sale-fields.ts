import { z } from 'zod';

/** Sale-specific form/query field builders (kept in the module; the shared `fields.ts` covers generic ones). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const firstValue = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const blankToNull = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));

export const requiredIsoDate = (label: string) =>
  z
    .string({ message: `${label} es obligatoria.` })
    .trim()
    .min(1, `${label} es obligatoria.`)
    .refine(isIsoDate, { message: `${label} no es válida.` });

/** Optional integer from a form: `''` / missing → `null`. */
export const optionalInteger = (label: string, min: number) =>
  z.preprocess(
    blankToNull,
    z
      .number({ message: `${label} debe ser un número.` })
      .int(`${label} debe ser un número entero.`)
      .min(min, `${label} debe ser al menos ${min}.`)
      .nullable(),
  );

/** Optional amount from a form: `''` / missing → `null`. */
export const optionalAmount = (label: string, min: number, minLabel = String(min)) =>
  z.preprocess(
    blankToNull,
    z
      .number({ message: `${label} debe ser un número.` })
      .min(min, `${label} debe ser al menos ${minLabel}.`)
      .max(99_999_999.99, `${label} es demasiado alto.`)
      .nullable(),
  );

/** A list of uuids from `formData.getAll()`. */
export const uuidList = (message: string) => z.array(z.uuid({ message }), { message });

/** Checkbox / hidden flag: `on`, `true` and `1` are truthy; anything else (absent included) is false. */
export const checkboxFlag = () => z.preprocess((v) => v === true || v === 'on' || v === 'true' || v === '1', z.boolean());

/** Optional uuid filter from `searchParams`: invalid values are ignored. */
export const optionalUuidFilter = z.preprocess(firstValue, z.uuid().optional()).catch(undefined);

/** Optional ISO date filter from `searchParams`: invalid values are ignored. */
export const optionalDateFilter = z
  .preprocess(firstValue, z.string().refine(isIsoDate).optional())
  .catch(undefined);

/** Optional positive integer filter (e.g. `expiringSoon=7`). */
export const optionalDaysFilter = z
  .preprocess(firstValue, z.coerce.number().int().min(1).max(365).optional())
  .catch(undefined);

/** Optional comma list filter restricted to `values` (`statusIn=active,expired`). */
export const optionalListFilter = <const T extends readonly string[]>(values: T) =>
  z
    .preprocess(firstValue, z.string().optional())
    .catch(undefined)
    .transform((v) => {
      const list = (v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is T[number] => (values as readonly string[]).includes(s));
      return list.length ? [...new Set(list)].join(',') : undefined;
    });
