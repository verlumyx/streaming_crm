import type { StatusKind } from '@/components/status-pill';
import type { ManualTransactionStatus } from '@/modules/manual-transaction/models/manual-transaction.model';

export const MANUAL_TRANSACTION_STATUS_LABELS: Record<ManualTransactionStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  cancelled: 'Cancelado',
};

export function manualTransactionStatusPill(status: ManualTransactionStatus): StatusKind {
  if (status === 'pending') return 'pendiente';
  if (status === 'approved') return 'activo';
  return 'inactivo';
}

/** `1.234,50 USD`. */
export function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
