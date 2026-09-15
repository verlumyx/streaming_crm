import type { UpdateCompanyInput } from '../validation/update-company.schema';

export class UpdateCompanyCommand {
  constructor(
    readonly name: string,
    readonly description: string | null,
  ) {}

  static fromInput(input: UpdateCompanyInput): UpdateCompanyCommand {
    return new UpdateCompanyCommand(input.name, input.description);
  }
}
