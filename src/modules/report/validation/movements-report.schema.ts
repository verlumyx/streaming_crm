import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from '@/modules/transaction/models/transaction.model';
import {
  limitParam,
  offsetParam,
  optionalDateParam,
  optionalEnumFilter,
  searchedParam,
} from '@/modules/shared/validation/fields';

/** Movimientos: `searchParams`. Never throws. */
export const movementsReportSchema = z.object({
  type: optionalEnumFilter(TRANSACTION_TYPES),
  category: optionalEnumFilter(TRANSACTION_CATEGORIES),
  dateFrom: optionalDateParam,
  dateTo: optionalDateParam,
  searched: searchedParam,
  limit: limitParam(20),
  offset: offsetParam(),
});

export type MovementsReportInput = z.infer<typeof movementsReportSchema>;
