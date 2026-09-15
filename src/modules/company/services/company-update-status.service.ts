import type { CompanyRow } from '../models/company.model';
import type { CompanyRepository } from '../repositories/company.repository';
import type { UpdateStatusCompanyCommand } from '../commands/update-status-company.command';
import { CompanyNotFoundException } from '../exceptions/company-not-found.exception';

/** Actualizar Estado: activate / deactivate (never delete). */
export class CompanyUpdateStatusService {
  constructor(private readonly repository: CompanyRepository) {}

  async execute(id: string, command: UpdateStatusCompanyCommand): Promise<CompanyRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new CompanyNotFoundException();

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id);
  }
}
