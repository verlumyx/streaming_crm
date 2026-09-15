import type { TransactionRepository } from '../repositories/transaction.repository';
import type { CreateTransactionCommand } from '../commands/create-transaction.command';
import { DomainError } from '@/modules/shared/exceptions/domain-error';

/**
 * Writes one ledger entry. Other modules inject `TransactionRepository` (from `createTransactionContainer(tx)`)
 * and call this inside the transaction opened by their action, so the entry commits or rolls back with them.
 */
export class TransactionRecordService {
  constructor(private readonly repository: TransactionRepository) {}

  async execute(command: CreateTransactionCommand): Promise<void> {
    if (!Number.isFinite(command.amount) || command.amount < 0) {
      throw new DomainError('El monto de la transacción debe ser un número mayor o igual a 0.');
    }
    await this.repository.create(command);
  }
}
