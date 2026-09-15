import { z } from 'zod';
import { COMPANY_STATUSES } from '../models/company.model';
import {
  limitParam,
  offsetParam,
  optionalEnumFilter,
  optionalFilter,
} from '@/modules/shared/validation/fields';

/** Listar: `searchParams` of the index page. Never throws. */
export const searchCompanySchema = z.object({
  name: optionalFilter,
  status: optionalEnumFilter(COMPANY_STATUSES),
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchCompanyInput = z.infer<typeof searchCompanySchema>;
