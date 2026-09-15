import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const PLAN_MODULE = {
  id: 'plans',
  label: 'Planes',
  icon: 'Package',
  order: 6,
  permissions: [
    { id: 'plans.list', label: 'Listar planes', order: 1 },
    { id: 'plans.create', label: 'Crear planes', order: 2 },
    { id: 'plans.show', label: 'Ver detalle de plan', order: 3 },
    { id: 'plans.update', label: 'Editar planes', order: 4 },
    { id: 'plans.update-status', label: 'Cambiar estado de plan', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const PLAN_PERMISSIONS = {
  LIST: 'plans.list',
  CREATE: 'plans.create',
  SHOW: 'plans.show',
  UPDATE: 'plans.update',
  UPDATE_STATUS: 'plans.update-status',
} as const;
