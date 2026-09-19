import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const CLAIM_MODULE = {
  id: 'claims',
  label: 'Reclamos',
  icon: 'MessageSquareWarning',
  order: 11,
  permissions: [
    { id: 'claims.list', label: 'Listar reclamos', order: 1 },
    { id: 'claims.create', label: 'Crear reclamos', order: 2 },
    { id: 'claims.show', label: 'Ver detalle de reclamo', order: 3 },
    { id: 'claims.update', label: 'Editar reclamos', order: 4 },
    { id: 'claims.update-status', label: 'Cambiar estado de reclamo', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const CLAIM_PERMISSIONS = {
  LIST: 'claims.list',
  CREATE: 'claims.create',
  SHOW: 'claims.show',
  UPDATE: 'claims.update',
  UPDATE_STATUS: 'claims.update-status',
} as const;
