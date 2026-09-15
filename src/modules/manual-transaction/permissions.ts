import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const MANUAL_TRANSACTION_MODULE = {
  id: 'manual-transactions',
  label: 'Transacciones manuales',
  icon: 'NotebookPen',
  order: 9,
  permissions: [
    { id: 'manual-transactions.list', label: 'Listar transacciones manuales', order: 1 },
    { id: 'manual-transactions.create', label: 'Crear transacciones manuales', order: 2 },
    { id: 'manual-transactions.show', label: 'Ver detalle de transacción manual', order: 3 },
    { id: 'manual-transactions.approve', label: 'Aprobar transacciones manuales', order: 4 },
    { id: 'manual-transactions.cancel', label: 'Cancelar transacciones manuales', order: 5 },
  ],
} as const satisfies ModuleDefinition;

export const MANUAL_TRANSACTION_PERMISSIONS = {
  LIST: 'manual-transactions.list',
  CREATE: 'manual-transactions.create',
  SHOW: 'manual-transactions.show',
  APPROVE: 'manual-transactions.approve',
  CANCEL: 'manual-transactions.cancel',
} as const;
