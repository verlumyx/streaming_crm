import type { UpdateServiceInput } from '../validation/update-service.schema';

export class UpdateServiceCommand {
  constructor(
    readonly name: string,
    readonly logoUrl: string | null,
    readonly maxProfiles: number,
  ) {}

  static fromInput(input: UpdateServiceInput): UpdateServiceCommand {
    return new UpdateServiceCommand(input.name, input.logoUrl, input.maxProfiles);
  }
}
