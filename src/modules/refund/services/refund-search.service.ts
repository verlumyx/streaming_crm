import type { RefundListItem, RefundRepository } from '../repositories/refund.repository';
import type { SearchRefundCommand } from '../commands/search-refund.command';

/** Listar. */
export class RefundSearchService {
  constructor(private readonly repository: RefundRepository) {}

  execute(command: SearchRefundCommand): Promise<{ data: RefundListItem[]; total: number }> {
    return this.repository.search(command);
  }
}
