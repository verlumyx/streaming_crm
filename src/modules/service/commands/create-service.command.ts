import type { CreateServiceInput } from '../validation/create-service.schema';

export class CreateServiceCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly name: string,
    readonly logoUrl: string | null,
    readonly maxProfiles: number,
  ) {}

  static fromInput(input: CreateServiceInput, companyId: string): CreateServiceCommand {
    return new CreateServiceCommand(input.id, companyId, input.name, input.logoUrl, input.maxProfiles);
  }
}
