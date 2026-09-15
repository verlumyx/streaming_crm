import type { AccountStatus } from '@/modules/account/models/account.model';

/** Query-string filters of the list (entity type is `AccountDto` from the serializer). */
export type AccountFilters = {
  code?: string;
  email?: string;
  status?: AccountStatus;
  serviceId?: string;
};

export type AccountMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
