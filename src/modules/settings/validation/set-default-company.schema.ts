import { z } from 'zod';
import { requiredUuid } from '@/modules/shared/validation/fields';

/** Empresa predeterminada. */
export const setDefaultCompanySchema = z.object({
  companyId: requiredUuid('La empresa no es válida.'),
});

export type SetDefaultCompanyInput = z.infer<typeof setDefaultCompanySchema>;
