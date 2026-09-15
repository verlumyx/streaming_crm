import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { isUuid } from '@/modules/shared/uuid';
import { plans, type PlanCapacity } from '../models/plan.model';

/** Keys MUST match `SearchPlanCommand.filters`. Filters combine with AND. */
export const planFilters = {
  name: (value) => ilike(plans.name, contains(value)),
  code: (value) => ilike(plans.code, contains(value)),
  capacity: (value) => eq(plans.capacity, value as PlanCapacity),
  serviceId: (value) => (isUuid(value) ? eq(plans.serviceId, value) : undefined),
  /** `'1'` → active, `'0'` → inactive. */
  active: (value) => eq(plans.active, value === '1'),
} satisfies FilterMap;
