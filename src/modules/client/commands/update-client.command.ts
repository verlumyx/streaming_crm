import type { UpdateClientInput } from '../validation/update-client.schema';

export class UpdateClientCommand {
  constructor(
    readonly name: string,
    readonly phone: string | null,
    readonly email: string | null,
    readonly notes: string | null,
  ) {}

  static fromInput(input: UpdateClientInput): UpdateClientCommand {
    return new UpdateClientCommand(input.name, input.phone, input.email, input.notes);
  }
}
