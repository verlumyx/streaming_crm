import type {
  RelatedType,
  TransactionCategory,
  TransactionRow,
  TransactionType,
} from '../models/transaction.model';

export type TransactionDto = {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  subcategory: string | null;
  relatedType: RelatedType | null;
  relatedId: string | null;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  reference: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  description: string;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
};

export function toTransactionDto(row: TransactionRow): TransactionDto {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    subcategory: row.subcategory,
    relatedType: row.relatedType,
    relatedId: row.relatedId,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
    periodFrom: row.periodFrom,
    periodTo: row.periodTo,
    description: row.description,
    notes: row.notes,
    recordedBy: row.recordedBy,
    createdAt: row.createdAt.toISOString(),
  };
}
