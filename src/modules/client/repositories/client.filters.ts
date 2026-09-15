import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { clients, type ClientStatus } from '../models/client.model';

/** Keys MUST match `SearchClientCommand.filters`. Filters combine with AND. */
export const clientFilters = {
  name: (value) => ilike(clients.name, contains(value)),
  email: (value) => ilike(clients.email, contains(value)),
  phone: (value) => ilike(clients.phone, contains(value)),
  code: (value) => ilike(clients.code, contains(value)),
  status: (value) => eq(clients.status, value as ClientStatus),
} satisfies FilterMap;
