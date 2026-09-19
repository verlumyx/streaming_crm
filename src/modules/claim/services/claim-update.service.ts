import { CLAIM_CLOSED_STATUS } from '../models/claim.model';
import type { ClaimDetail, ClaimRepository } from '../repositories/claim.repository';
import type { UpdateClaimCommand } from '../commands/update-claim.command';
import { ClaimNotFoundException } from '../exceptions/claim-not-found.exception';
import { ClaimClosedException } from '../exceptions/claim-closed.exception';
import { ClaimClientNotFoundException } from '../exceptions/claim-client-not-found.exception';

/** Actualizar: datos del reclamo mientras no esté cerrado (fila bloqueada contra un cierre concurrente). */
export class ClaimUpdateService {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(id: string, companyId: string, command: UpdateClaimCommand): Promise<ClaimDetail> {
    const row = await this.repository.lockById(id, companyId);
    if (!row) throw new ClaimNotFoundException();
    if (row.status === CLAIM_CLOSED_STATUS) throw new ClaimClosedException();

    const client = await this.repository.findClient(command.clientId, companyId);
    if (!client) throw new ClaimClientNotFoundException();

    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
