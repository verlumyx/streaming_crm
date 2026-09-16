import { z } from 'zod';
import { optionalEmail, optionalText, requiredText } from '@/modules/shared/validation/fields';

/** Actualizar. Also the base of the create schema. */
export const updateClientSchema = z.object({
  name: requiredText('El nombre', 150),
  phone: requiredText('El teléfono', 30),
  email: optionalEmail(255),
  notes: optionalText('La nota'),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
