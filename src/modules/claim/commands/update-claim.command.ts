import type { ClaimChannel } from '../models/claim.model';
import type { UpdateClaimInput } from '../validation/update-claim.schema';

/** Actualizar: datos del reclamo; el estado viaja por `UpdateStatusClaimCommand`. */
export class UpdateClaimCommand {
  constructor(
    readonly clientId: string,
    readonly subject: string,
    readonly description: string,
    readonly channel: ClaimChannel,
  ) {}

  static fromInput(input: UpdateClaimInput): UpdateClaimCommand {
    return new UpdateClaimCommand(input.clientId, input.subject, input.description, input.channel);
  }
}
