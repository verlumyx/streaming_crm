import { z } from 'zod';
import { limitParam, offsetParam, optionalFilter } from '@/modules/shared/validation/fields';

const optionalDate = z
  .preprocess((v) => (Array.isArray(v) ? v[0] : v), z.iso.date().optional())
  .catch(undefined);

/** Listar: `searchParams` of the index page. Never throws. */
export const searchManualTransactionSchema = z.object({
  code: optionalFilter,
  reference: optionalFilter,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchManualTransactionInput = z.infer<typeof searchManualTransactionSchema>;
