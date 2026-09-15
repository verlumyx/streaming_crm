import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { accounts, type AccountStatus } from '../models/account.model';

/** Keys MUST match `SearchAccountCommand.filters`. Filters combine with AND. */
export const accountFilters = {
  code: (value) => ilike(accounts.code, contains(value)),
  email: (value) => ilike(accounts.email, contains(value)),
  status: (value) => eq(accounts.status, value as AccountStatus),
  serviceId: (value) => eq(accounts.serviceId, value),
} satisfies FilterMap;
