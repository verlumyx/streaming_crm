import { eq, ilike, or } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { claims, type ClaimChannel, type ClaimStatus } from '../models/claim.model';

/** Keys MUST match `SearchClaimCommand.filters`. Los filtros se combinan con AND; `q` busca código, asunto o descripción. */
export const claimFilters = {
  q: (value) =>
    or(
      ilike(claims.code, contains(value)),
      ilike(claims.subject, contains(value)),
      ilike(claims.description, contains(value)),
    ),
  status: (value) => eq(claims.status, value as ClaimStatus),
  channel: (value) => eq(claims.channel, value as ClaimChannel),
  clientId: (value) => eq(claims.clientId, value),
} satisfies FilterMap;
