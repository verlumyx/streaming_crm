import { eq, gte, ilike, lte } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import {
  transactions,
  type RelatedType,
  type TransactionCategory,
  type TransactionType,
} from '../models/transaction.model';

/** Keys MUST match `SearchTransactionCommand.filters`. `dateFrom` / `dateTo` are inclusive calendar dates. */
export const transactionFilters = {
  type: (value) => eq(transactions.type, value as TransactionType),
  category: (value) => eq(transactions.category, value as TransactionCategory),
  paymentMethod: (value) => ilike(transactions.paymentMethod, contains(value)),
  reference: (value) => ilike(transactions.reference, contains(value)),
  relatedType: (value) => eq(transactions.relatedType, value as RelatedType),
  relatedId: (value) => eq(transactions.relatedId, value),
  dateFrom: (value) => gte(transactions.date, value),
  dateTo: (value) => lte(transactions.date, value),
} satisfies FilterMap;
