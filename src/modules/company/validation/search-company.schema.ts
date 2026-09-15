import { z } from 'zod';
import { COMPANY_STATUSES } from '../models/company.model';
import {
  limitParam,
  offsetParam,
  optionalEnumFilter,
  optionalFilter,
} from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';

/** Listar: `searchParams` of the index page. Never throws. */
export const searchCompanySchema = z.object({
  name: optionalFilter,
  status: optionalEnumFilter(COMPANY_STATUSES),
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchCompanyInput = z.infer<typeof searchCompanySchema>;
