import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const SALE_MODULE = {
  id: 'sales',
  label: 'Ventas',
  icon: 'ShoppingCart',
  order: 8,
  permissions: [
    { id: 'sales.list', label: 'Listar ventas', order: 1 },
    { id: 'sales.create', label: 'Crear ventas', order: 2 },
    { id: 'sales.show', label: 'Ver detalle de venta', order: 3 },
    { id: 'sales.renew', label: 'Renovar ventas', order: 4 },
    { id: 'sales.reactivate', label: 'Reactivar ventas', order: 5 },
    { id: 'sales.cancel', label: 'Expulsar ventas', order: 6 },
  ],
} as const satisfies ModuleDefinition;

export const SALE_PERMISSIONS = {
  LIST: 'sales.list',
  CREATE: 'sales.create',
  SHOW: 'sales.show',
  RENEW: 'sales.renew',
  REACTIVATE: 'sales.reactivate',
  CANCEL: 'sales.cancel',
} as const;
