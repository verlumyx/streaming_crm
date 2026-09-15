import type { ManualTransactionStatus } from '../models/manual-transaction.model';
import type { TransactionCategory, TransactionType } from '@/modules/transaction/models/transaction.model';
import type {
  ManualTransactionDetail,
  ManualTransactionListItem,
  RecordedByUser,
} from '../repositories/manual-transaction.repository';

export type ManualTransactionLineDto = {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string | null;
};

type ManualTransactionBaseDto = {
  id: string;
  code: string;
  date: string;
  paymentMethod: string;
  reference: string | null;
  currency: string;
  description: string | null;
  notes: string | null;
  total: number;
  status: ManualTransactionStatus;
  approvedAt: string | null;
  cancelledAt: string | null;
  isPending: boolean;
  canBeApproved: boolean;
  canBeCancelled: boolean;
  recordedByUser: RecordedByUser;
  createdAt: string;
};

export type ManualTransactionDto = ManualTransactionBaseDto & { lines: ManualTransactionLineDto[] };
export type ManualTransactionListItemDto = ManualTransactionBaseDto & { lineCount: number };

function toBase(row: ManualTransactionListItem | ManualTransactionDetail): ManualTransactionBaseDto {
  const isPending = row.status === 'pending';
  return {
    id: row.id,
    code: row.code,
    date: row.date,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
    currency: row.currency,
    description: row.description,
    notes: row.notes,
    total: Number(row.total),
    status: row.status,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    isPending,
    canBeApproved: isPending,
    canBeCancelled: isPending,
    recordedByUser: row.recordedByUser,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toManualTransactionDto(row: ManualTransactionDetail): ManualTransactionDto {
  return {
    ...toBase(row),
    lines: row.lines.map((l) => ({
      id: l.id,
      type: l.type,
      category: l.category,
      amount: Number(l.amount),
      description: l.description,
    })),
  };
}

export function toManualTransactionListItemDto(row: ManualTransactionListItem): ManualTransactionListItemDto {
  return { ...toBase(row), lineCount: row.lineCount };
}
