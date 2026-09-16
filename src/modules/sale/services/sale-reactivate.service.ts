import { todayIsoDate } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { ReactivateSaleCommand } from '../commands/reactivate-sale.command';
import { canBeReactivated, profileCoherenceError, saleEndDate, unavailableProfiles } from '../domain/sale-rules';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';
import { SaleCannotBeReactivatedException } from '../exceptions/sale-cannot-be-reactivated.exception';
import { SaleInvalidProfilesException } from '../exceptions/sale-invalid-profiles.exception';
import { SaleProfilesUnavailableException } from '../exceptions/sale-profiles-unavailable.exception';

/**
 * Reactivar: cancelled sales or expired ones beyond the grace period. Reuses the current profiles
 * (or the replacements sent after a conflict), locks and re-checks them, restarts the cycle at
 * `today + durationDays`, clears the cancellation and records a `renewal` ledger income.
 */
export class SaleReactivateService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly graceDays: number,
  ) {}

  async execute(
    id: string,
    companyId: string,
    command: ReactivateSaleCommand,
    today = todayIsoDate(),
  ): Promise<SaleRow> {
    const sale = await this.repository.findForUpdate(id, companyId);
    if (!sale) throw new SaleNotFoundException();
    if (!canBeReactivated(sale, today, this.graceDays)) throw new SaleCannotBeReactivatedException();

    const currentIds = await this.repository.profileIdsOf(sale.id);
    const replacing = command.profileIds.length > 0;
    const targetIds = replacing ? [...command.profileIds] : currentIds;
    if (targetIds.length === 0) throw new SaleInvalidProfilesException('Selecciona al menos un perfil.');

    const locked = await this.repository.lockProfiles(targetIds, sale.id);

    if (replacing) {
      const service = await this.repository.findService(sale.serviceId, companyId);
      const incoherence = profileCoherenceError(targetIds, locked, {
        companyId,
        serviceId: sale.serviceId,
        capacity: sale.capacity,
        maxProfiles: service?.maxProfiles ?? 0,
      });
      if (incoherence) throw new SaleInvalidProfilesException(incoherence);
    }

    // Profiles still occupied by THIS sale (not taken by a newer sale) are acceptable.
    const unavailable = unavailableProfiles(locked, { allowOwnOccupied: true });
    if (unavailable.length > 0) throw new SaleProfilesUnavailableException(unavailable);

    const durationDays = command.durationDays ?? sale.durationDays;
    const price = command.price ?? Number(sale.price);
    const newEndDate = saleEndDate(today, durationDays);

    await this.repository.replaceProfiles(
      sale.id,
      targetIds,
      currentIds.filter((profileId) => !targetIds.includes(profileId)),
    );

    await this.repository.reactivate(sale, {
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
      new CreateTransactionCommand(uuidv7(), companyId, 'renewal', price, today, `Reactivación de venta ${sale.code}`, {
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
