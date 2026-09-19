import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import { CLAIM_CHANNELS, CLAIM_STATUSES } from '../models/claim.model';

const optionalUuidFilter = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.uuid().optional()).catch(undefined);

/** Listar: `searchParams` de la página índice. Nunca lanza. */
export const searchClaimSchema = z.object({
  q: optionalFilter,
  status: optionalEnumFilter(CLAIM_STATUSES),
  channel: optionalEnumFilter(CLAIM_CHANNELS),
  clientId: optionalUuidFilter,
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchClaimInput = z.infer<typeof searchClaimSchema>;
