import { z } from 'zod';
import { COMPANY_STATUSES } from '../models/company.model';

/** Actualizar Estado. */
export const updateStatusCompanySchema = z.object({
  status: z.enum(COMPANY_STATUSES, { message: 'El estado no es válido.' }),
});

export type UpdateStatusCompanyInput = z.infer<typeof updateStatusCompanySchema>;
