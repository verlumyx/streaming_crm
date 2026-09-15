import type { TransactionCategory, TransactionType, RelatedType } from '../models/transaction.model';

/** Keys MUST match `transactionFilters`. */
export type TransactionSearchFilters = Partial<{
  type: TransactionType;
  category: TransactionCategory;
  paymentMethod: string;
  reference: string;
  relatedType: RelatedType;
  relatedId: string;
  dateFrom: string;
  dateTo: string;
}>;

export class SearchTransactionCommand {
  readonly filters: TransactionSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: TransactionSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? 20;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }
}
