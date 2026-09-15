import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { roles, type RoleStatus } from '../models/role.model';

/** Keys MUST match `SearchRoleCommand.filters`. Filters combine with AND. */
export const roleFilters = {
  name: (value) => ilike(roles.name, contains(value)),
  status: (value) => eq(roles.status, value as RoleStatus),
  description: (value) => ilike(roles.description, contains(value)),
} satisfies FilterMap;
