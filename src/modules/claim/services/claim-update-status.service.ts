import { CLAIM_CLOSED_STATUS } from '../models/claim.model';
import type { ClaimDetail, ClaimRepository } from '../repositories/claim.repository';
import type { UpdateStatusClaimCommand } from '../commands/update-status-claim.command';
import { ClaimNotFoundException } from '../exceptions/claim-not-found.exception';
import { ClaimClosedException } from '../exceptions/claim-closed.exception';

/**
 * Actualizar Estado: abierto → en proceso → resuelto / cerrado (y de vuelta mientras no esté cerrado).
 * `closed` es terminal, así que un reclamo cerrado no admite más cambios. Nunca se borra un reclamo.
 */
export class ClaimUpdateStatusService {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusClaimCommand): Promise<ClaimDetail> {
    const row = await this.repository.lockById(id, companyId);
    if (!row) throw new ClaimNotFoundException();
    if (row.status === CLAIM_CLOSED_STATUS) throw new ClaimClosedException();

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
