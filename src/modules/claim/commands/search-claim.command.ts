import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchClaimInput } from '../validation/search-claim.schema';

/** Keys MUST match `claimFilters`. */
export type ClaimSearchFilters = Partial<Pick<SearchClaimInput, 'q' | 'status' | 'channel' | 'clientId'>>;

export class SearchClaimCommand {
  readonly filters: ClaimSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: ClaimSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchClaimInput, companyId: string): SearchClaimCommand {
    const { limit, offset, ...filters } = input;
    return new SearchClaimCommand({ filters, limit, offset, companyId });
  }
}
