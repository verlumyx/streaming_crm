import { uuidv7 } from '@/modules/shared/uuid';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { ManualTransactionRepository } from '../repositories/manual-transaction.repository';
import { ManualTransactionNotFoundException } from '../exceptions/manual-transaction-not-found.exception';
import { InvalidManualTransactionStatusException } from '../exceptions/invalid-manual-transaction-status.exception';

/**
 * Aprobar: pending → approved, writing ONE ledger entry per line (related `ManualTransaction`).
 * Runs inside the action's transaction; the header row is locked first so concurrent approvals
 * can never duplicate ledger entries.
 */
export class ManualTransactionApproveService {
  constructor(
    private readonly repository: ManualTransactionRepository,
    private readonly ledger: TransactionRepository,
  ) {}

  async execute(id: string, companyId: string, resolvedBy: string | null): Promise<void> {
    const header = await this.repository.lockById(id, companyId);
    if (!header) throw new ManualTransactionNotFoundException();
    if (header.status !== 'pending') throw new InvalidManualTransactionStatusException();

    for (const line of await this.repository.linesOf(id)) {
      await this.ledger.create(
        new CreateTransactionCommand(
          uuidv7(),
          companyId,
          line.category,
          Number(line.amount),
          header.date,
          line.description ?? header.description ?? `Transacción manual ${header.code}`,
          {
            type: line.type,
            paymentMethod: header.paymentMethod,
            currency: header.currency,
            reference: header.reference,
            relatedType: 'ManualTransaction',
            relatedId: header.id,
            recordedBy: resolvedBy,
          },
        ),
      );
    }

    await this.repository.approve(header);
  }
}
