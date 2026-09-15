import type { PlanCapacity } from '@/modules/plan/models/plan.model';

/** Query-string filters of the list (entity type is `PlanDto` from the serializer). */
export type PlanFilters = {
  name?: string;
  code?: string;
  capacity?: PlanCapacity;
  serviceId?: string;
  /** `'1'` active, `'0'` inactive. */
  active?: '1' | '0';
};

export type PlanMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
