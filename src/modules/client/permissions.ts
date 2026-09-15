import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const CLIENT_MODULE = {
  id: 'clients',
  label: 'Clientes',
  icon: 'Contact',
  order: 4,
  permissions: [
    { id: 'clients.list', label: 'Listar clientes', order: 1 },
    { id: 'clients.create', label: 'Crear clientes', order: 2 },
    { id: 'clients.show', label: 'Ver detalle de cliente', order: 3 },
    { id: 'clients.update', label: 'Editar clientes', order: 4 },
    { id: 'clients.update-status', label: 'Cambiar estado de cliente', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const CLIENT_PERMISSIONS = {
  LIST: 'clients.list',
  CREATE: 'clients.create',
  SHOW: 'clients.show',
  UPDATE: 'clients.update',
  UPDATE_STATUS: 'clients.update-status',
} as const;
