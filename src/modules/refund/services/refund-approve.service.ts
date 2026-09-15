import { todayIsoDate } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import type { SaleRepository } from '@/modules/sale/repositories/sale.repository';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { RefundRepository } from '../repositories/refund.repository';
import type { ResolveRefundCommand } from '../commands/resolve-refund.command';
import { RefundNotFoundException } from '../exceptions/refund-not-found.exception';
import { RefundAlreadyResolvedException } from '../exceptions/refund-already-resolved.exception';
import { RefundSaleNotFoundException } from '../exceptions/refund-sale-not-found.exception';

/**
 * Aprobar: pending → approved. In the action's transaction:
 * - the sale is cancelled (profiles freed) unless it already was — idempotent for refunds requested from "Expulsar";
 * - one ledger expense `refund` is recorded (related `Refund`).
 *
 * Locks the sale first and then the refund (same order as the sale "Expulsar" flow, which locks the sale and then
 * inserts the refund), and re-checks the status after the lock, so concurrent approvals never duplicate the expense.
 */
export class RefundApproveService {
  constructor(
    private readonly repository: RefundRepository,
    private readonly sales: SaleRepository,
    private readonly ledger: TransactionRepository,
  ) {}

  async execute(command: ResolveRefundCommand, today: string = todayIsoDate()): Promise<void> {
    const refund = await this.repository.findById(command.refundId, command.companyId);
    if (!refund) throw new RefundNotFoundException();
    if (refund.status !== 'pending') throw new RefundAlreadyResolvedException();

    const sale = await this.sales.findForUpdate(refund.saleId, command.companyId);
    const locked = await this.repository.lockById(command.refundId, command.companyId);
    if (!locked) throw new RefundNotFoundException();
    if (locked.status !== 'pending') throw new RefundAlreadyResolvedException();
    if (!sale) throw new RefundSaleNotFoundException();

    if (sale.status !== 'cancelled') {
      await this.sales.cancel(sale, `Reembolso ${locked.code}`);
    }

    await this.ledger.create(
      new CreateTransactionCommand(
        uuidv7(),
        command.companyId,
        'refund',
        Number(locked.amount),
        today,
        `Reembolso venta ${sale.code} a ${refund.client?.name ?? 'cliente'}`,
        {
          type: 'expense',
          paymentMethod: 'cash',
          relatedType: 'Refund',
          relatedId: locked.id,
          recordedBy: command.resolvedBy,
        },
      ),
    );

    await this.repository.approve(locked, command.resolvedBy);
  }
}
