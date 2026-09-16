import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { RejectSaleCommand } from '../commands/reject-sale.command';
import { canBeApproved } from '../domain/sale-rules';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';
import { SaleNotPendingException } from '../exceptions/sale-not-pending.exception';

/** Rechazar: the payment of a pending sale was not verified. Final state: no profiles, no ledger, no refund. */
export class SaleRejectService {
  constructor(private readonly repository: SaleRepository) {}

  async execute(command: RejectSaleCommand): Promise<SaleRow> {
    const sale = await this.repository.findForUpdate(command.id, command.companyId);
    if (!sale) throw new SaleNotFoundException();
    if (!canBeApproved(sale)) throw new SaleNotPendingException();

    await this.repository.reject(sale, command.rejectedBy, command.rejectionReason);
    return this.repository.findOrFail(sale.id, command.companyId);
  }
}
