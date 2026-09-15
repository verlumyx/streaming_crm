import { eq, ilike } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { companies, type CompanyStatus } from '../models/company.model';

/** Keys MUST match `SearchCompanyCommand.filters`. Filters combine with AND. */
export const companyFilters = {
  name: (value) => ilike(companies.name, contains(value)),
  status: (value) => eq(companies.status, value as CompanyStatus),
} satisfies FilterMap;
