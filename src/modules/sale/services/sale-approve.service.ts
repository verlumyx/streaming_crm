import { todayIsoDate } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { ApproveSaleCommand } from '../commands/approve-sale.command';
import { canBeApproved, unavailableProfiles } from '../domain/sale-rules';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';
import { SaleNotPendingException } from '../exceptions/sale-not-pending.exception';
import { SaleProfilesUnavailableException } from '../exceptions/sale-profiles-unavailable.exception';

/**
 * Aprobar (runs inside the action's transaction): the seller verified the payment. The pending sale keeps the
 * period chosen in the wizard; its linked profiles, locked `FOR UPDATE`, must still be `available` (a pending sale
 * does not reserve them). Then the sale becomes `active`, the profiles are occupied and the `sale` ledger income
 * is recorded on the approval date.
 */
export class SaleApproveService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(command: ApproveSaleCommand, today = todayIsoDate()): Promise<SaleRow> {
    const sale = await this.repository.findForUpdate(command.id, command.companyId);
    if (!sale) throw new SaleNotFoundException();
    if (!canBeApproved(sale)) throw new SaleNotPendingException();

    const locked = await this.repository.lockProfiles(await this.repository.profileIdsOf(sale.id));
    const unavailable = unavailableProfiles(locked);
    if (unavailable.length > 0) {
      throw new SaleProfilesUnavailableException(
        unavailable,
        'Algunos perfiles de la venta ya no están disponibles. Recházala y registra una nueva venta con otros perfiles.',
      );
    }

    const [client, service] = await Promise.all([
      this.repository.findClient(sale.clientId, command.companyId),
      this.repository.findService(sale.serviceId, command.companyId),
    ]);

    await this.repository.approve(sale, command.approvedBy);
    await this.transactionRepository.create(
      new CreateTransactionCommand(
        uuidv7(),
        command.companyId,
        'sale',
        Number(sale.price),
        today,
        `Venta ${service?.name ?? '—'} a ${client?.name ?? '—'}`,
        {
          relatedType: 'Sale',
          relatedId: sale.id,
          periodFrom: sale.startDate,
          periodTo: sale.endDate,
          recordedBy: command.approvedBy,
        },
      ),
    );

    return this.repository.findOrFail(sale.id, command.companyId);
  }
}
