import type { ClientStatus } from '@/modules/client/models/client.model';

/** Query-string filters of the list (entity type is `ClientDto` from the serializer). */
export type ClientFilters = {
  name?: string;
  email?: string;
  phone?: string;
  code?: string;
  status?: ClientStatus;
};

export type ClientMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
