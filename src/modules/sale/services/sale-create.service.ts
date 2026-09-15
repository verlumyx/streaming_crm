import { addDays } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { CreateSaleCommand } from '../commands/create-sale.command';
import { profileCoherenceError, unavailableProfiles } from '../domain/sale-rules';
import { SaleClientNotFoundException } from '../exceptions/sale-client-not-found.exception';
import { SaleClientInactiveException } from '../exceptions/sale-client-inactive.exception';
import { SalePlanNotFoundException } from '../exceptions/sale-plan-not-found.exception';
import { SaleInvalidProfilesException } from '../exceptions/sale-invalid-profiles.exception';
import { SaleProfilesUnavailableException } from '../exceptions/sale-profiles-unavailable.exception';

/**
 * Crear (runs inside the action's transaction): active client of the company, plan of the company,
 * profiles locked `FOR UPDATE` and checked for coherence + availability, plan snapshot,
 * `endDate = startDate + durationDays`, pivot rows + occupied profiles, and the `sale` ledger income.
 */
export class SaleCreateService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(command: CreateSaleCommand): Promise<SaleRow> {
    const client = await this.repository.findClient(command.clientId, command.companyId);
    if (!client) throw new SaleClientNotFoundException();
    if (client.status !== 'active') throw new SaleClientInactiveException();

    const plan = await this.repository.findPlan(command.planId, command.companyId);
    if (!plan) throw new SalePlanNotFoundException();

    const locked = await this.repository.lockProfiles(command.profileIds);
    const incoherence = profileCoherenceError(command.profileIds, locked, {
      companyId: command.companyId,
      serviceId: plan.serviceId,
      capacity: plan.capacity,
      maxProfiles: plan.maxProfiles,
    });
    if (incoherence) throw new SaleInvalidProfilesException(incoherence);

    const unavailable = unavailableProfiles(locked);
    if (unavailable.length > 0) throw new SaleProfilesUnavailableException(unavailable);

    // Plan snapshot: the sale never reads these values from the plan again.
    const price = Number(plan.salePrice);
    const endDate = addDays(command.startDate, plan.durationDays);

    await this.repository.create({
      id: command.id,
      companyId: command.companyId,
      clientId: client.id,
      planId: plan.id,
      agentId: command.agentId,
      serviceId: plan.serviceId,
      capacity: plan.capacity,
      durationDays: plan.durationDays,
      price,
      startDate: command.startDate,
      endDate,
      notes: command.notes,
    });
    await this.repository.assignProfiles(command.id, command.profileIds);

    await this.transactionRepository.create(
      new CreateTransactionCommand(
        uuidv7(),
        command.companyId,
        'sale',
        price,
        command.startDate,
        `Venta ${plan.serviceName} a ${client.name}`,
        {
          relatedType: 'Sale',
          relatedId: command.id,
          periodFrom: command.startDate,
          periodTo: endDate,
          recordedBy: command.agentId,
        },
      ),
    );

    return this.repository.findOrFail(command.id, command.companyId);
  }
}
