import { z } from 'zod';
import { CLIENT_STATUSES } from '../models/client.model';

/** Actualizar Estado. */
export const updateStatusClientSchema = z.object({
  status: z.enum(CLIENT_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateStatusClientInput = z.infer<typeof updateStatusClientSchema>;
