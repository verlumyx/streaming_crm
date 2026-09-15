import type { SaleClientOption, SaleRepository } from '../repositories/sale.repository';

export const SALE_CLIENT_SEARCH_LIMIT = 20;

/** Wizard step 1: up to 20 ACTIVE clients of the company whose name or code contains the term (case-insensitive). */
export class SaleClientSearchService {
  constructor(private readonly repository: SaleRepository) {}

  execute(companyId: string, term: string): Promise<SaleClientOption[]> {
    return this.repository.searchActiveClients(companyId, term.trim().slice(0, 100), SALE_CLIENT_SEARCH_LIMIT);
  }
}
