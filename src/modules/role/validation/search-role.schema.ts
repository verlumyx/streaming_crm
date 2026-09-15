import { z } from 'zod';
import { ROLE_STATUSES } from '../models/role.model';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';

/** Listar: `searchParams` of the index page. Never throws. */
export const searchRoleSchema = z.object({
  name: optionalFilter,
  status: optionalEnumFilter(ROLE_STATUSES),
  description: optionalFilter,
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchRoleInput = z.infer<typeof searchRoleSchema>;
