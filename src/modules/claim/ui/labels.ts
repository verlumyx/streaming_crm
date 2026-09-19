import type { StatusKind } from '@/components/status-pill';
import type { ClaimChannel, ClaimStatus } from '@/modules/claim/models/claim.model';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  open: 'Abierto',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

export const CLAIM_CHANNEL_LABELS: Record<ClaimChannel, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Teléfono',
  email: 'Correo',
  in_person: 'Presencial',
  bot: 'Bot IA',
  other: 'Otro',
};

export function claimStatusPill(status: ClaimStatus): StatusKind {
  if (status === 'open') return 'pendiente';
  if (status === 'in_progress') return 'libre';
  if (status === 'resolved') return 'activo';
  return 'inactivo';
}
