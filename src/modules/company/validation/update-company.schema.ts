import { z } from 'zod';
import { optionalText, requiredText } from '@/modules/shared/validation/fields';

/** Actualizar. Also the base of the create schema. Name uniqueness is a business rule (service). */
export const updateCompanySchema = z.object({
  name: requiredText('El nombre', 255),
  description: optionalText('La descripción'),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
