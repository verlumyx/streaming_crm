import type { RefundRepository } from '../repositories/refund.repository';
import type { UpdateRefundCommand } from '../commands/update-refund.command';
import { RefundNotFoundException } from '../exceptions/refund-not-found.exception';
import { RefundAlreadyResolvedException } from '../exceptions/refund-already-resolved.exception';

/** Actualizar: amount and reason, only while the refund is pending (row locked against a concurrent resolution). */
export class RefundUpdateService {
  constructor(private readonly repository: RefundRepository) {}

  async execute(id: string, companyId: string, command: UpdateRefundCommand): Promise<void> {
    const row = await this.repository.lockById(id, companyId);
    if (!row) throw new RefundNotFoundException();
    if (row.status !== 'pending') throw new RefundAlreadyResolvedException();

    await this.repository.update(row, command);
  }
}
