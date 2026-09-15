import type { RefundStatus } from '../models/refund.model';
import type { SaleStatus } from '@/modules/sale/models/sale.model';
import { toTransactionDto, type TransactionDto } from '@/modules/transaction/serializers/transaction.serializer';
import type {
  RefundableSale,
  RefundClientRef,
  RefundListItem,
  RefundUserRef,
} from '../repositories/refund.repository';
import type { RefundOverview } from '../services/refund-find.service';

export type RefundSaleRefDto = { id: string; code: string; status: SaleStatus; price: number };

export type RefundListItemDto = {
  id: string;
  code: string;
  saleId: string;
  clientId: string;
  sale: RefundSaleRefDto | null;
  client: RefundClientRef | null;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  isPending: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type RefundDto = RefundListItemDto & {
  notes: string | null;
  requestedByUser: RefundUserRef;
  resolvedByUser: RefundUserRef;
  transactions: TransactionDto[];
};

export type RefundableSaleDto = { id: string; code: string; clientName: string | null; price: number; status: SaleStatus };

export function toRefundListItemDto(row: RefundListItem): RefundListItemDto {
  return {
    id: row.id,
    code: row.code,
    saleId: row.saleId,
    clientId: row.clientId,
    sale: row.sale ? { ...row.sale, price: Number(row.sale.price) } : null,
    client: row.client,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status,
    isPending: row.status === 'pending',
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toRefundDto({ refund, transactions }: RefundOverview): RefundDto {
  return {
    ...toRefundListItemDto(refund),
    notes: refund.notes,
    requestedByUser: refund.requestedByUser,
    resolvedByUser: refund.resolvedByUser,
    transactions: transactions.map(toTransactionDto),
  };
}

export function toRefundableSaleDto(row: RefundableSale): RefundableSaleDto {
  return { id: row.id, code: row.code, clientName: row.clientName, price: Number(row.price), status: row.status };
}
