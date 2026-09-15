import type { SaleRepository } from '@/modules/sale/repositories/sale.repository';
import type { RefundDetail, RefundRepository } from '../repositories/refund.repository';
import type { CreateRefundCommand } from '../commands/create-refund.command';
import { RefundSaleNotRefundableException } from '../exceptions/refund-sale-not-refundable.exception';

const REFUNDABLE_SALE_STATUSES: readonly string[] = ['active', 'cancelled'];

/**
 * Crear: a pending refund for an `active` or `cancelled` sale of the company, with the sale's client as snapshot.
 * It never writes to the ledger (that happens on approval).
 */
export class RefundCreateService {
  constructor(
    private readonly repository: RefundRepository,
    private readonly sales: SaleRepository,
  ) {}

  async execute(command: CreateRefundCommand): Promise<RefundDetail> {
    const sale = await this.sales.findById(command.saleId, command.companyId);
    if (!sale || !REFUNDABLE_SALE_STATUSES.includes(sale.status)) throw new RefundSaleNotRefundableException();

    await this.repository.create({
      id: command.id,
      companyId: command.companyId,
      saleId: sale.id,
      clientId: sale.clientId,
      amount: command.amount,
      reason: command.reason,
      requestedBy: command.requestedBy,
    });

    return this.repository.findOrFail(command.id, command.companyId);
  }
}
