import type { StatusKind } from '@/components/status-pill';
import type { SaleCapacity, SaleStatus } from '@/modules/sale/models/sale.model';
import type { ProfileStatus } from '@/modules/account/models/account.model';

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  active: 'Activa',
  expired: 'Expirada',
  cancelled: 'Expulsada',
};

export const SALE_CAPACITY_LABELS: Record<SaleCapacity, string> = {
  profile: 'Perfil',
  full_account: 'Cuenta completa',
};

export function saleStatusPill(status: SaleStatus): StatusKind {
  if (status === 'active') return 'activo';
  if (status === 'expired') return 'vencido';
  return 'inactivo';
}

export const SALE_PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  available: 'Disponible',
  occupied: 'Ocupado',
  maintenance: 'Mantenimiento',
};
