import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const ACCOUNT_MODULE = {
  id: 'accounts',
  label: 'Cuentas',
  icon: 'Boxes',
  order: 7,
  permissions: [
    { id: 'accounts.list', label: 'Listar cuentas', order: 1 },
    { id: 'accounts.create', label: 'Crear cuentas', order: 2 },
    { id: 'accounts.show', label: 'Ver detalle de cuenta', order: 3 },
    { id: 'accounts.update', label: 'Editar cuentas', order: 4 },
    { id: 'accounts.credentials', label: 'Ver credenciales', order: 5 },
    { id: 'accounts.renew', label: 'Registrar renovaciones', order: 6 },
  ],
} as const satisfies ModuleDefinition;

export const ACCOUNT_PERMISSIONS = {
  LIST: 'accounts.list',
  CREATE: 'accounts.create',
  SHOW: 'accounts.show',
  UPDATE: 'accounts.update',
  CREDENTIALS: 'accounts.credentials',
  RENEW: 'accounts.renew',
} as const;
