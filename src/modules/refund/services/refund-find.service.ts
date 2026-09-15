import type { TransactionRow } from '@/modules/transaction/models/transaction.model';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { RefundDetail, RefundRepository } from '../repositories/refund.repository';
import { RefundNotFoundException } from '../exceptions/refund-not-found.exception';

export type RefundOverview = { refund: RefundDetail; transactions: TransactionRow[] };

/** Ver: the refund with its sale, client, users and the ledger entries linked to it. */
export class RefundFindService {
  constructor(
    private readonly repository: RefundRepository,
    private readonly ledger: TransactionRepository,
  ) {}

  async execute(id: string, companyId: string): Promise<RefundOverview> {
    const refund = await this.repository.findById(id, companyId);
    if (!refund) throw new RefundNotFoundException();

    const transactions = await this.ledger.findRelated(companyId, 'Refund', refund.id);
    return { refund, transactions };
  }
}
