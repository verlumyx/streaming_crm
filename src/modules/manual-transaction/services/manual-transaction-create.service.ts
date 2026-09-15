import type { ManualTransactionDetail, ManualTransactionRepository } from '../repositories/manual-transaction.repository';
import type { CreateManualTransactionCommand } from '../commands/create-manual-transaction.command';

/** Crear: registers a pending batch. It never writes to the ledger (that happens on approval). */
export class ManualTransactionCreateService {
  constructor(private readonly repository: ManualTransactionRepository) {}

  async execute(command: CreateManualTransactionCommand): Promise<ManualTransactionDetail> {
    await this.repository.create(command);
    return this.repository.findOrFail(command.id, command.companyId);
  }
}
