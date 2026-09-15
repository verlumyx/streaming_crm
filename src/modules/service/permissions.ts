import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const SERVICE_MODULE = {
  id: 'services',
  label: 'Servicios',
  icon: 'Clapperboard',
  order: 5,
  permissions: [
    { id: 'services.list', label: 'Listar servicios', order: 1 },
    { id: 'services.create', label: 'Crear servicios', order: 2 },
    { id: 'services.show', label: 'Ver detalle de servicio', order: 3 },
    { id: 'services.update', label: 'Editar servicios', order: 4 },
    { id: 'services.update-status', label: 'Cambiar estado de servicio', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const SERVICE_PERMISSIONS = {
  LIST: 'services.list',
  CREATE: 'services.create',
  SHOW: 'services.show',
  UPDATE: 'services.update',
  UPDATE_STATUS: 'services.update-status',
} as const;
