import type { ClaimStatus } from '../models/claim.model';
import type { UpdateStatusClaimInput } from '../validation/update-status-claim.schema';

/** Actualizar Estado. `resolutionNotes === undefined` deja intactas las notas guardadas. */
export class UpdateStatusClaimCommand {
  constructor(
    readonly status: ClaimStatus,
    readonly resolutionNotes: string | null | undefined,
    readonly resolvedBy: string | null,
  ) {}

  static fromInput(input: UpdateStatusClaimInput, resolvedBy: string | null): UpdateStatusClaimCommand {
    return new UpdateStatusClaimCommand(input.status, input.resolutionNotes, resolvedBy);
  }
}
