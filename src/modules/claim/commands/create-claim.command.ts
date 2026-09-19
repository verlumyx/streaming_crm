import type { ClaimChannel } from '../models/claim.model';
import type { CreateClaimInput } from '../validation/create-claim.schema';

/** Crear: un reclamo `open` de un cliente de la empresa. */
export class CreateClaimCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly clientId: string,
    readonly subject: string,
    readonly description: string,
    readonly channel: ClaimChannel,
    readonly reportedBy: string | null,
  ) {}

  static fromInput(input: CreateClaimInput, companyId: string, reportedBy: string | null): CreateClaimCommand {
    return new CreateClaimCommand(
      input.id,
      companyId,
      input.clientId,
      input.subject,
      input.description,
      input.channel,
      reportedBy,
    );
  }
}
