import type { ClaimListItem, ClaimRepository } from '../repositories/claim.repository';
import type { SearchClaimCommand } from '../commands/search-claim.command';

/** Listar. */
export class ClaimSearchService {
  constructor(private readonly repository: ClaimRepository) {}

  execute(command: SearchClaimCommand): Promise<{ data: ClaimListItem[]; total: number }> {
    return this.repository.search(command);
  }
}
