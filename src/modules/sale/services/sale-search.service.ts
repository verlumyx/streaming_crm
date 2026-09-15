import type { SaleListItem, SaleRepository } from '../repositories/sale.repository';
import type { SearchSaleCommand } from '../commands/search-sale.command';

/** Listar (and the expirations report, with `orderBy: 'endDate'`). */
export class SaleSearchService {
  constructor(private readonly repository: SaleRepository) {}

  execute(command: SearchSaleCommand): Promise<{ data: SaleListItem[]; total: number }> {
    return this.repository.search(command);
  }
}
