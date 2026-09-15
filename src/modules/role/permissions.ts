import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const ROLE_MODULE = {
  id: 'roles',
  label: 'Roles',
  icon: 'Users',
  order: 2,
  permissions: [
    { id: 'roles.list', label: 'Listar roles', order: 1 },
    { id: 'roles.create', label: 'Crear roles', order: 2 },
    { id: 'roles.show', label: 'Ver detalle de rol', order: 3 },
    { id: 'roles.update', label: 'Editar roles', order: 4 },
    { id: 'roles.update-status', label: 'Cambiar estado de rol', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const ROLE_PERMISSIONS = {
  LIST: 'roles.list',
  CREATE: 'roles.create',
  SHOW: 'roles.show',
  UPDATE: 'roles.update',
  UPDATE_STATUS: 'roles.update-status',
} as const;
