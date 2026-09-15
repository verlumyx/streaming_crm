import { z } from 'zod';
import { optionalText, requiredText } from '@/modules/shared/validation/fields';

/** `''` / whitespace from a form → `undefined`, so a blank number reports "obligatorio". */
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

/** Actualizar. Also the base of the create schema. Name uniqueness is a business rule (service). */
export const updateServiceSchema = z.object({
  name: requiredText('El nombre', 100),
  logoUrl: optionalText('La URL del logo', 255),
  maxProfiles: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ message: 'El máximo de perfiles es obligatorio.' })
      .int('El máximo de perfiles debe ser un número entero.')
      .min(1, 'El máximo de perfiles debe ser al menos 1.'),
  ),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
