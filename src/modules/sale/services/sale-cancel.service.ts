import { uuidv7 } from '@/modules/shared/uuid';
import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { PendingRefundWriter } from '../repositories/pending-refund.writer';
import type { CancelSaleCommand } from '../commands/cancel-sale.command';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';
import { SaleAlreadyCancelledException } from '../exceptions/sale-already-cancelled.exception';
import { SaleCannotBeCancelledException } from '../exceptions/sale-cannot-be-cancelled.exception';
import { canBeCancelled } from '../domain/sale-rules';

/**
 * Expulsar: cancels the sale and frees its profiles. No ledger row: an optional refund is only
 * requested (pending); the expense is recorded when the refund is approved.
 */
export class SaleCancelService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly refundWriter: PendingRefundWriter,
  ) {}

  async execute(id: string, companyId: string, command: CancelSaleCommand): Promise<SaleRow> {
    const sale = await this.repository.findForUpdate(id, companyId);
    if (!sale) throw new SaleNotFoundException();
    if (sale.status === 'cancelled') throw new SaleAlreadyCancelledException();
    if (!canBeCancelled(sale)) throw new SaleCannotBeCancelledException();

    await this.repository.cancel(sale, command.cancellationReason);

    if (command.createRefund) {
      await this.refundWriter.create({
        id: uuidv7(),
        companyId,
        saleId: sale.id,
        clientId: sale.clientId,
        amount: command.refundAmount ?? Number(sale.price),
        reason: command.refundReason ?? command.cancellationReason,
        requestedBy: command.requestedBy,
      });
    }

    return this.repository.findOrFail(id, companyId);
  }
}
