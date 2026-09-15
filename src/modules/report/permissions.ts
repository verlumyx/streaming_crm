import type { ModuleDefinition } from '@/modules/shared/permissions/types';

export const REPORT_MODULE = {
  id: 'reports',
  label: 'Reportes',
  icon: 'ChartColumn',
  order: 11,
  permissions: [
    { id: 'reports.movements', label: 'Ver reporte de movimientos', order: 1 },
    { id: 'reports.income_expenses', label: 'Ver reporte de ingresos y gastos', order: 2 },
    { id: 'reports.service_plan', label: 'Ver reporte por servicio/plan', order: 3 },
    { id: 'reports.expirations', label: 'Ver reporte de vencimientos', order: 4 },
  ],
} as const satisfies ModuleDefinition;

export const REPORT_PERMISSIONS = {
  MOVEMENTS: 'reports.movements',
  INCOME_EXPENSES: 'reports.income_expenses',
  SERVICE_PLAN: 'reports.service_plan',
  EXPIRATIONS: 'reports.expirations',
} as const;
