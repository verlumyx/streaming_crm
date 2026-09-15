import type { StatusKind } from '@/components/status-pill';
import type { AccountRenewalType, AccountStatus, ProfileStatus } from '@/modules/account/models/account.model';

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Activa',
  down: 'Caída',
  maintenance: 'Mantenimiento',
  cancelled: 'Cancelada',
};

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  available: 'Disponible',
  occupied: 'Ocupado',
  maintenance: 'Mantenimiento',
};

export const RENEWAL_TYPE_LABELS: Record<AccountRenewalType, string> = {
  purchase: 'Compra',
  renewal: 'Renovación',
};

export function accountStatusPill(status: AccountStatus): StatusKind {
  const map: Record<AccountStatus, StatusKind> = {
    active: 'activo',
    down: 'vencido',
    maintenance: 'pendiente',
    cancelled: 'inactivo',
  };
  return map[status];
}

export function profileStatusPill(status: ProfileStatus): StatusKind {
  const map: Record<ProfileStatus, StatusKind> = {
    available: 'libre',
    occupied: 'activo',
    maintenance: 'pendiente',
  };
  return map[status];
}
