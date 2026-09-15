import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';

export const SERVICE_ACTIVE_FILTERS = ['1', '0'] as const;

/** Listar: `searchParams` of the index page. Never throws. */
export const searchServiceSchema = z.object({
  name: optionalFilter,
  code: optionalFilter,
  active: optionalEnumFilter(SERVICE_ACTIVE_FILTERS),
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchServiceInput = z.infer<typeof searchServiceSchema>;
