import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const REFUND_MODULE = {
  id: 'refunds',
  label: 'Reembolsos',
  icon: 'Undo2',
  order: 10,
  permissions: [
    { id: 'refunds.list', label: 'Listar reembolsos', order: 1 },
    { id: 'refunds.create', label: 'Crear reembolsos', order: 2 },
    { id: 'refunds.show', label: 'Ver detalle de reembolso', order: 3 },
    { id: 'refunds.update', label: 'Editar reembolsos', order: 4 },
    { id: 'refunds.approve', label: 'Aprobar reembolsos', order: 5 },
    { id: 'refunds.reject', label: 'Rechazar reembolsos', order: 6 },
  ],
} as const satisfies ModuleDefinition;

export const REFUND_PERMISSIONS = {
  LIST: 'refunds.list',
  CREATE: 'refunds.create',
  SHOW: 'refunds.show',
  UPDATE: 'refunds.update',
  APPROVE: 'refunds.approve',
  REJECT: 'refunds.reject',
} as const;
