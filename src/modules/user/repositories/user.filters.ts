import { eq, ilike } from 'drizzle-orm';
import { user } from '@/db/auth-schema';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';

/** Keys MUST match `SearchUserCommand.filters`. Filters combine with AND. */
export const userFilters = {
  name: (value) => ilike(user.name, contains(value)),
  email: (value) => ilike(user.email, contains(value)),
  emailVerified: (value) =>
    value === 'verified' ? eq(user.emailVerified, true) : value === 'unverified' ? eq(user.emailVerified, false) : undefined,
} satisfies FilterMap;
