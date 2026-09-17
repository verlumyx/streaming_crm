import type { SaleRepository } from '@/modules/sale/repositories/sale.repository';
import { RejectSaleCommand } from '@/modules/sale/commands/reject-sale.command';
import { SaleRejectService } from '@/modules/sale/services/sale-reject.service';
import { DomainError } from '@/modules/shared/exceptions/domain-error';

export const STALE_PENDING_REASON = 'Pago no verificado a tiempo.';

/**
 * Frees the inventory a pending sale of the bot is holding.
 *
 * A pending sale reserves its profiles so two customers cannot pay for the same one. A customer who
 * says "I'll pay later" and never does would otherwise block that stock forever, so the sale is
 * rejected once the window is over and the profiles go back on sale.
 */
export class BotStaleSalesService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly rejectService: SaleRejectService,
  ) {}

  async execute(minutes: number, botUserIds: readonly string[]): Promise<{ rejected: number }> {
    const stale = await this.repository.findStalePendingSaleIds(minutes, botUserIds);
    let rejected = 0;

    for (const sale of stale) {
      try {
        await this.rejectService.execute(new RejectSaleCommand(sale.id, sale.companyId, null, STALE_PENDING_REASON));
        rejected++;
      } catch (error) {
        // Someone approved or rejected it in the meantime: nothing to do.
        if (!(error instanceof DomainError)) throw error;
      }
    }

    return { rejected };
  }
}
