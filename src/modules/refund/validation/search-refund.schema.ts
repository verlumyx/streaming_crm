import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import { REFUND_STATUSES } from '../models/refund.model';

const optionalUuidFilter = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.uuid().optional()).catch(undefined);

/** Listar: `searchParams` of the index page. Never throws. */
export const searchRefundSchema = z.object({
  q: optionalFilter,
  status: optionalEnumFilter(REFUND_STATUSES),
  saleId: optionalUuidFilter,
  clientId: optionalUuidFilter,
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchRefundInput = z.infer<typeof searchRefundSchema>;
