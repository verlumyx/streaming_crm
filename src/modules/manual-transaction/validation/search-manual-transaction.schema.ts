import { z } from 'zod';
import { limitParam, offsetParam, optionalFilter } from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';

const optionalDate = z
  .preprocess((v) => (Array.isArray(v) ? v[0] : v), z.iso.date().optional())
  .catch(undefined);

/** Listar: `searchParams` of the index page. Never throws. */
export const searchManualTransactionSchema = z.object({
  code: optionalFilter,
  reference: optionalFilter,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchManualTransactionInput = z.infer<typeof searchManualTransactionSchema>;
