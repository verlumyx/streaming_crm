import { z } from 'zod';
import { SALE_CAPACITIES, SALE_STATUSES } from '@/modules/sale/models/sale.model';
import { limitParam, offsetParam, optionalDateParam, optionalEnumFilter, searchedParam } from '@/modules/shared/validation/fields';

export const SERVICE_PLAN_GROUPS = ['service', 'plan'] as const;
export type ServicePlanGroup = (typeof SERVICE_PLAN_GROUPS)[number];

/** Servicio / Plan: `searchParams`. The date range (on `created_at`) defaults to the current month. */
export const servicePlanReportSchema = z.object({
  dateFrom: optionalDateParam,
  dateTo: optionalDateParam,
  groupBy: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.enum(SERVICE_PLAN_GROUPS)).catch('service'),
  serviceId: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.uuid().optional()).catch(undefined),
  status: optionalEnumFilter(SALE_STATUSES),
  capacity: optionalEnumFilter(SALE_CAPACITIES),
  searched: searchedParam,
  limit: limitParam(50, 200),
  offset: offsetParam(),
});

export type ServicePlanReportInput = z.infer<typeof servicePlanReportSchema>;
