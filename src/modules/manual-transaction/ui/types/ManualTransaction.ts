import type { TransactionCatalog } from '@/modules/transaction/models/transaction.model';

export type ManualTransactionFilters = { code?: string; reference?: string; dateFrom?: string; dateTo?: string };

export type ManualTransactionMeta = { total: number; limit: number; offset: number; hasMore: boolean };

/** Editable line before persisting. */
export type ManualTransactionLineDraft = { category: string; amount: number; description: string };

/** Catalog computed on the server and passed down as a prop. */
export type TransactionCatalogDto = TransactionCatalog;
