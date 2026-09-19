import type { ClaimDetail, ClaimRepository } from '../repositories/claim.repository';
import type { CreateClaimCommand } from '../commands/create-claim.command';
import { ClaimClientNotFoundException } from '../exceptions/claim-client-not-found.exception';

/** Crear: un reclamo `open` a nombre de un cliente de la empresa. */
export class ClaimCreateService {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(command: CreateClaimCommand): Promise<ClaimDetail> {
    const client = await this.repository.findClient(command.clientId, command.companyId);
    if (!client) throw new ClaimClientNotFoundException();

    await this.repository.create({
      id: command.id,
      companyId: command.companyId,
      clientId: client.id,
      subject: command.subject,
      description: command.description,
      channel: command.channel,
      reportedBy: command.reportedBy,
    });

    return this.repository.findOrFail(command.id, command.companyId);
  }
}
