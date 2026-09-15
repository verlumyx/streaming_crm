import type { CompanyRow } from '../models/company.model';
import type { CompanyRepository } from '../repositories/company.repository';
import type { SearchCompanyCommand } from '../commands/search-company.command';

/** Listar. */
export class CompanySearchService {
  constructor(private readonly repository: CompanyRepository) {}

  execute(command: SearchCompanyCommand): Promise<{ data: CompanyRow[]; total: number }> {
    return this.repository.search(command);
  }
}
