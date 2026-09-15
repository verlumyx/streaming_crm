import { z } from 'zod';
import { PLAN_CAPACITIES } from '../models/plan.model';
import { isUuid } from '@/modules/shared/uuid';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';

export const PLAN_ACTIVE_FILTERS = ['1', '0'] as const;

/** Listar: `searchParams` of the index page. Never throws; unknown values are ignored. */
export const searchPlanSchema = z.object({
  name: optionalFilter,
  code: optionalFilter,
  capacity: optionalEnumFilter(PLAN_CAPACITIES),
  serviceId: optionalFilter.transform((value) => (value && isUuid(value) ? value : undefined)),
  active: optionalEnumFilter(PLAN_ACTIVE_FILTERS),
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchPlanInput = z.infer<typeof searchPlanSchema>;
