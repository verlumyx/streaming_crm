import type { ClaimDetail, ClaimRepository } from '../repositories/claim.repository';
import { ClaimNotFoundException } from '../exceptions/claim-not-found.exception';

/** Ver: el reclamo con su cliente y los usuarios que lo levantaron y resolvieron. */
export class ClaimFindService {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(id: string, companyId: string): Promise<ClaimDetail> {
    const claim = await this.repository.findById(id, companyId);
    if (!claim) throw new ClaimNotFoundException();
    return claim;
  }
}
