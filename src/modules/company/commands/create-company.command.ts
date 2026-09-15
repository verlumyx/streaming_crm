import type { CreateCompanyInput } from '../validation/create-company.schema';

/** Companies are global: there is no `companyId`; `createdBy` is the system owner creating it. */
export class CreateCompanyCommand {
  constructor(
    readonly id: string,
    readonly createdBy: string,
    readonly name: string,
    readonly description: string | null,
  ) {}

  static fromInput(input: CreateCompanyInput, createdBy: string): CreateCompanyCommand {
    return new CreateCompanyCommand(input.id, createdBy, input.name, input.description);
  }
}
