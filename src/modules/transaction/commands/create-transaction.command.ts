import type { RelatedType, TransactionCategory, TransactionType } from '../models/transaction.model';

/**
 * A ledger entry written as a side-effect of another module (sale, renewal, account purchase, refund, manual line).
 * Amounts are always positive; `type` is derived from the category when omitted.
 */
export class CreateTransactionCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly category: TransactionCategory,
    readonly amount: number,
    readonly date: string,
    readonly description: string,
    readonly options: {
      readonly type?: TransactionType;
      readonly paymentMethod?: string;
      readonly currency?: string;
      readonly reference?: string | null;
      readonly relatedType?: RelatedType | null;
      readonly relatedId?: string | null;
      readonly periodFrom?: string | null;
      readonly periodTo?: string | null;
      readonly recordedBy?: string | null;
      readonly notes?: string | null;
    } = {},
  ) {}
}
