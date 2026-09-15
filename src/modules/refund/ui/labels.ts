import type { StatusKind } from '@/components/status-pill';
import type { RefundStatus } from '@/modules/refund/models/refund.model';

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export function refundStatusPill(status: RefundStatus): StatusKind {
  if (status === 'pending') return 'pendiente';
  if (status === 'approved') return 'activo';
  return 'inactivo';
}
