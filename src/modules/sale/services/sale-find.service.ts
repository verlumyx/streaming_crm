import { todayIsoDate } from '@/lib/format';
import type { TransactionRow } from '@/modules/transaction/models/transaction.model';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { SaleAvailableProfile, SaleDetail, SaleRepository } from '../repositories/sale.repository';
import { canBeReactivated, requiredProfileCount } from '../domain/sale-rules';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';

export type SaleOverview = {
  sale: SaleDetail;
  transactions: TransactionRow[];
  /** Available profiles of the sale's service, offered as replacements when the sale is reactivable. */
  replacementProfiles: SaleAvailableProfile[];
  requiredProfileCount: number;
};

/** Ver: the sale with profiles, renewals and its related ledger entries. */
export class SaleFindService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly graceDays: number,
  ) {}

  async execute(id: string, companyId: string, today = todayIsoDate()): Promise<SaleOverview> {
    const sale = await this.repository.findDetail(id, companyId);
    if (!sale) throw new SaleNotFoundException();

    const [transactions, replacementProfiles] = await Promise.all([
      this.transactionRepository.findRelated(companyId, 'Sale', sale.id),
      canBeReactivated(sale, today, this.graceDays)
        ? this.repository.listAvailableProfiles(companyId, sale.serviceId)
        : Promise.resolve([]),
    ]);

    return {
      sale,
      transactions,
      replacementProfiles,
      requiredProfileCount: requiredProfileCount(sale.capacity, sale.service?.maxProfiles ?? sale.saleProfiles.length),
    };
  }
}
