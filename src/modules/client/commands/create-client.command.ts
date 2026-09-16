import type { CreateClientInput } from '../validation/create-client.schema';

export class CreateClientCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly createdBy: string | null,
    readonly name: string,
    readonly phone: string,
    readonly email: string | null,
    readonly notes: string | null,
  ) {}

  static fromInput(input: CreateClientInput, companyId: string, createdBy: string | null): CreateClientCommand {
    return new CreateClientCommand(input.id, companyId, createdBy, input.name, input.phone, input.email, input.notes);
  }
}
