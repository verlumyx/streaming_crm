import type { ManualTransactionRepository } from '../repositories/manual-transaction.repository';
import { ManualTransactionNotFoundException } from '../exceptions/manual-transaction-not-found.exception';
import { InvalidManualTransactionStatusException } from '../exceptions/invalid-manual-transaction-status.exception';

/** Cancelar: pending → cancelled. Never touches the ledger. */
export class ManualTransactionCancelService {
  constructor(private readonly repository: ManualTransactionRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    const header = await this.repository.lockById(id, companyId);
    if (!header) throw new ManualTransactionNotFoundException();
    if (header.status !== 'pending') throw new InvalidManualTransactionStatusException();

    await this.repository.cancel(header);
  }
}
