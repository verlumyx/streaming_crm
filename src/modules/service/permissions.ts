import type { ModuleDefinition } from '@/modules/shared/permissions/types';

/** Read-only module: the catalogue is preset, so there is no create / update / update-status. */
export const SERVICE_MODULE = {
  id: 'services',
  label: 'Servicios',
  icon: 'Clapperboard',
  order: 5,
  permissions: [
    { id: 'services.list', label: 'Listar servicios', order: 1 },
    { id: 'services.show', label: 'Ver detalle de servicio', order: 2 },
  ],
} as const satisfies ModuleDefinition;

export const SERVICE_PERMISSIONS = {
  LIST: 'services.list',
  SHOW: 'services.show',
} as const;
