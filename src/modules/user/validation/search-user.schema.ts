import { z } from 'zod';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';

export const EMAIL_VERIFIED_FILTERS = ['verified', 'unverified'] as const;
export type EmailVerifiedFilter = (typeof EMAIL_VERIFIED_FILTERS)[number];

/** Listar: `searchParams` of the index page. Never throws. `emailVerified=all` (or anything else) is ignored. */
export const searchUserSchema = z.object({
  name: optionalFilter,
  email: optionalFilter,
  emailVerified: optionalEnumFilter(EMAIL_VERIFIED_FILTERS),
  limit: limitParam(20),
  offset: offsetParam(),
});

export type SearchUserInput = z.infer<typeof searchUserSchema>;
