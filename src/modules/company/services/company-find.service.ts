import type { CompanyRow } from '../models/company.model';
import type { CompanyRepository } from '../repositories/company.repository';
import { CompanyNotFoundException } from '../exceptions/company-not-found.exception';

/** Ver / Editar. */
export class CompanyFindService {
  constructor(private readonly repository: CompanyRepository) {}

  async execute(id: string): Promise<CompanyRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new CompanyNotFoundException();
    return row;
  }
}
