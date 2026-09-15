import { z } from 'zod';
import { ROLE_STATUSES } from '../models/role.model';

/** Actualizar Estado. */
export const updateStatusRoleSchema = z.object({
  status: z.enum(ROLE_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateStatusRoleInput = z.infer<typeof updateStatusRoleSchema>;
