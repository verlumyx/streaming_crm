import type { CompanyStatus } from '../models/company.model';
import type { UpdateStatusCompanyInput } from '../validation/update-status-company.schema';

export class UpdateStatusCompanyCommand {
  constructor(readonly status: CompanyStatus) {}

  static fromInput(input: UpdateStatusCompanyInput): UpdateStatusCompanyCommand {
    return new UpdateStatusCompanyCommand(input.status);
  }
}
