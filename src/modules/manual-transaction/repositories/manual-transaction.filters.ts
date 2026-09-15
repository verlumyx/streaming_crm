import { gte, ilike, lte } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { manualTransactions } from '../models/manual-transaction.model';

/** Keys MUST match `SearchManualTransactionCommand.filters`. Date bounds are inclusive. */
export const manualTransactionFilters = {
  code: (value) => ilike(manualTransactions.code, contains(value)),
  reference: (value) => ilike(manualTransactions.reference, contains(value)),
  dateFrom: (value) => gte(manualTransactions.date, value),
  dateTo: (value) => lte(manualTransactions.date, value),
} satisfies FilterMap;
