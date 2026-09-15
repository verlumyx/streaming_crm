import type { CompanyStatus } from '@/modules/company/models/company.model';

/** Query-string filters of the list (entity type is `CompanyDto` from the serializer). */
export type CompanyFilters = {
  name?: string;
  status?: CompanyStatus;
};

export type CompanyMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
