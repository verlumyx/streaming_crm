import type { RefundRepository } from '../repositories/refund.repository';
import type { ResolveRefundCommand } from '../commands/resolve-refund.command';
import { RefundNotFoundException } from '../exceptions/refund-not-found.exception';
import { RefundAlreadyResolvedException } from '../exceptions/refund-already-resolved.exception';

/** Rechazar: pending → rejected. Never touches the sale nor the ledger. */
export class RefundRejectService {
  constructor(private readonly repository: RefundRepository) {}

  async execute(command: ResolveRefundCommand): Promise<void> {
    const row = await this.repository.lockById(command.refundId, command.companyId);
    if (!row) throw new RefundNotFoundException();
    if (row.status !== 'pending') throw new RefundAlreadyResolvedException();

    await this.repository.reject(row, command.resolvedBy);
  }
}
