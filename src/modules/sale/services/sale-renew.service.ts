import { todayIsoDate } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { RenewSaleCommand } from '../commands/renew-sale.command';
import { canBeRenewed, saleEndDate } from '../domain/sale-rules';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';
import { SaleCannotBeRenewedException } from '../exceptions/sale-cannot-be-renewed.exception';

/**
 * Renovar: only active sales or expired ones within the grace period. The new cycle starts at the
 * current `endDate`; profiles are untouched. Records a `renewal` ledger income.
 */
export class SaleRenewService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly graceDays: number,
  ) {}

  async execute(id: string, companyId: string, command: RenewSaleCommand, today = todayIsoDate()): Promise<SaleRow> {
    const sale = await this.repository.findForUpdate(id, companyId);
    if (!sale) throw new SaleNotFoundException();
    if (!canBeRenewed(sale, today, this.graceDays)) throw new SaleCannotBeRenewedException();

    const durationDays = command.durationDays ?? sale.durationDays;
    const price = command.price ?? Number(sale.price);
    const newEndDate = saleEndDate(sale.endDate, durationDays);

    await this.repository.renew(sale, {
      id: command.id,
      renewedAt: today,
      previousEndDate: sale.endDate,
      newEndDate,
      durationDays,
      price,
      renewedBy: command.renewedBy,
      notes: command.notes,
    });

    await this.transactionRepository.create(
      new CreateTransactionCommand(uuidv7(), companyId, 'renewal', price, today, `Renovación de venta ${sale.code}`, {
        relatedType: 'Sale',
        relatedId: sale.id,
        periodFrom: today,
        periodTo: newEndDate,
        recordedBy: command.renewedBy ?? sale.agentId,
      }),
    );

    return this.repository.findOrFail(id, companyId);
  }
}
