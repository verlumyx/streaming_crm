/** Query-string filters of the list (entity type is `ServiceDto` from the serializer). */
export type ServiceFilters = {
  name?: string;
  code?: string;
  /** `'1'` active, `'0'` inactive. */
  active?: '1' | '0';
};

export type ServiceMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
