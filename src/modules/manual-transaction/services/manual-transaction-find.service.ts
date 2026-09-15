import type { ManualTransactionDetail, ManualTransactionRepository } from '../repositories/manual-transaction.repository';
import { ManualTransactionNotFoundException } from '../exceptions/manual-transaction-not-found.exception';

/** Ver: header with its lines. */
export class ManualTransactionFindService {
  constructor(private readonly repository: ManualTransactionRepository) {}

  async execute(id: string, companyId: string): Promise<ManualTransactionDetail> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ManualTransactionNotFoundException();
    return row;
  }
}
