import { z } from 'zod';
import { CLIENT_STATUSES } from '../models/client.model';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';

/** Listar: `searchParams` of the index page. Never throws. */
export const searchClientSchema = z.object({
  name: optionalFilter,
  email: optionalFilter,
  phone: optionalFilter,
  code: optionalFilter,
  status: optionalEnumFilter(CLIENT_STATUSES),
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchClientInput = z.infer<typeof searchClientSchema>;
