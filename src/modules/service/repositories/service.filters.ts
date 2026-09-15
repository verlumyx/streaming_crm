import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { services } from '../models/service.model';

/** Keys MUST match `SearchServiceCommand.filters`. Filters combine with AND. */
export const serviceFilters = {
  name: (value) => ilike(services.name, contains(value)),
  code: (value) => ilike(services.code, contains(value)),
  /** `'1'` → active, `'0'` → inactive. */
  active: (value) => eq(services.active, value === '1'),
} satisfies FilterMap;
