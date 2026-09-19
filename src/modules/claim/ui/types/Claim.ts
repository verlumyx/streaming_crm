import type { ClaimChannel, ClaimStatus } from '@/modules/claim/models/claim.model';

/** Filtros del listado en la query string (la entidad es `ClaimDto`, del serializer). */
export type ClaimFilters = {
  q?: string;
  status?: ClaimStatus;
  channel?: ClaimChannel;
  clientId?: string;
};

export type ClaimMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};
