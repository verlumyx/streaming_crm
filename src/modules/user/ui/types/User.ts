import type { EmailVerifiedFilter } from '@/modules/user/validation/search-user.schema';

/** Query-string filters of the list (entity type is `UserDto` from the serializer). */
export type UserFilters = {
  name?: string;
  email?: string;
  emailVerified?: EmailVerifiedFilter;
};

export type UserMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
