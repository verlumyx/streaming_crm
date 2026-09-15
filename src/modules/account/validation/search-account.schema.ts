import { z } from 'zod';
import { isUuid } from '@/modules/shared/uuid';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import { ACCOUNT_STATUSES } from '../models/account.model';

/** Listar: `searchParams` of the index page. Never throws. */
export const searchAccountSchema = z.object({
  code: optionalFilter,
  email: optionalFilter,
  status: optionalEnumFilter(ACCOUNT_STATUSES),
  serviceId: optionalFilter.transform((v) => (isUuid(v) ? v : undefined)),
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchAccountInput = z.infer<typeof searchAccountSchema>;
