import { z } from 'zod';
import { MEMBERSHIP_STATUSES } from '@/modules/shared/models/user-company.model';

/** Actualizar Estado: the membership status in the current company (`user_company.status`). */
export const updateStatusUserSchema = z.object({
  status: z.enum(MEMBERSHIP_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateStatusUserInput = z.infer<typeof updateStatusUserSchema>;
