import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const USER_MODULE = {
  id: 'users',
  label: 'Usuarios',
  icon: 'UserCheck',
  order: 1,
  permissions: [
    { id: 'users.list', label: 'Listar usuarios', order: 1 },
    { id: 'users.create', label: 'Crear usuarios', order: 2 },
    { id: 'users.show', label: 'Ver detalle de usuario', order: 3 },
    { id: 'users.update', label: 'Editar usuarios', order: 4 },
    { id: 'users.update-status', label: 'Cambiar estado de usuario', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const USER_PERMISSIONS = {
  LIST: 'users.list',
  CREATE: 'users.create',
  SHOW: 'users.show',
  UPDATE: 'users.update',
  UPDATE_STATUS: 'users.update-status',
} as const;
