import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Calendar date `YYYY-MM-DD` (feminine label: "La fecha de compra"). */
export const requiredIsoDate = (label: string) =>
  z
    .string({ message: `${label} es obligatoria.` })
    .trim()
    .min(1, `${label} es obligatoria.`)
    .refine((v) => v === '' || (ISO_DATE.test(v) && isRealIsoDate(v)), `${label} no es válida.`);

/** Money from a form: required, ≥ 0, fits `numeric(10, 2)`. */
export const requiredAmount = (label: string) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce
      .number({ message: `${label} debe ser un número válido.` })
      .min(0, `${label} no puede ser negativo.`)
      .max(99_999_999.99, `${label} es demasiado alto.`),
  );

export const requiredAccountEmail = z
  .string({ message: 'El email es obligatorio.' })
  .trim()
  .min(1, 'El email es obligatorio.')
  .max(255, 'El email no puede superar 255 caracteres.')
  .pipe(z.email({ message: 'El email no es válido.' }));

/** Passwords are never trimmed (a leading space may be part of the secret). */
export const requiredPassword = z
  .string({ message: 'La contraseña es obligatoria.' })
  .max(255, 'La contraseña no puede superar 255 caracteres.')
  .refine((v) => v.trim().length > 0, 'La contraseña es obligatoria.');

/** Actualizar: blank keeps the current password (`null`). */
export const optionalPassword = z
  .string()
  .max(255, 'La contraseña no puede superar 255 caracteres.')
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : null));

export const profileNumber = z.coerce
  .number({ message: 'El número de perfil no es válido.' })
  .int('El número de perfil no es válido.')
  .min(1, 'El número de perfil debe ser al menos 1.');

/** Nullable text inside a JSON profile line: missing → `undefined` (untouched), `''`/null → `null`. */
export const profileText = (label: string, max?: number) => {
  const base = z.string().trim();
  const bounded = max ? base.max(max, `${label} no puede superar ${max} caracteres.`) : base;
  return z
    .preprocess((v) => (typeof v === 'number' ? String(v) : v), bounded.nullable().optional())
    .transform((v) => (v === undefined ? undefined : v ? v : null));
};

/** The profile rows travel as a JSON string in one hidden `profiles` input. */
export const jsonArray = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return [];
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    z.array(item, { message: 'Los perfiles no son válidos.' }),
  );
