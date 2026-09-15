import type { CompanyRow } from '../models/company.model';
import type { CompanyRepository } from '../repositories/company.repository';
import type { UpdateCompanyCommand } from '../commands/update-company.command';
import { CompanyNotFoundException } from '../exceptions/company-not-found.exception';
import { CompanyNameAlreadyExistsException } from '../exceptions/company-name-already-exists.exception';

/** Actualizar: name and description; a company keeps its own name. */
export class CompanyUpdateService {
  constructor(private readonly repository: CompanyRepository) {}

  async execute(id: string, command: UpdateCompanyCommand): Promise<CompanyRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new CompanyNotFoundException();

    if (await this.repository.existsByName(command.name, id)) {
      throw new CompanyNameAlreadyExistsException();
    }

    await this.repository.update(row, command);
    return this.repository.findOrFail(id);
  }
}
