import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const COMPANY_MODULE = {
  id: 'companies',
  label: 'Empresas',
  icon: 'Building2',
  order: 3,
  permissions: [
    { id: 'companies.list', label: 'Listar empresas', order: 1 },
    { id: 'companies.create', label: 'Crear empresas', order: 2 },
    { id: 'companies.show', label: 'Ver detalle de empresa', order: 3 },
    { id: 'companies.update', label: 'Editar empresas', order: 4 },
    { id: 'companies.update-status', label: 'Cambiar estado de empresa', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const COMPANY_PERMISSIONS = {
  LIST: 'companies.list',
  CREATE: 'companies.create',
  SHOW: 'companies.show',
  UPDATE: 'companies.update',
  UPDATE_STATUS: 'companies.update-status',
} as const;
