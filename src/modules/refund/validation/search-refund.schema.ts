import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { REFUND_STATUSES } from '../models/refund.model';

const optionalUuidFilter = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.uuid().optional()).catch(undefined);

/** Listar: `searchParams` of the index page. Never throws. */
export const searchRefundSchema = z.object({
  q: optionalFilter,
  status: optionalEnumFilter(REFUND_STATUSES),
  saleId: optionalUuidFilter,
  clientId: optionalUuidFilter,
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchRefundInput = z.infer<typeof searchRefundSchema>;
