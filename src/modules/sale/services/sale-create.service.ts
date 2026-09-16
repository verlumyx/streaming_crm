import { uuidv7 } from '@/modules/shared/uuid';
import type { SaleRow } from '../models/sale.model';
import type { SaleRepository } from '../repositories/sale.repository';
import type { CreateSaleCommand } from '../commands/create-sale.command';
import { profileCoherenceError, saleEndDate, unavailableProfiles } from '../domain/sale-rules';
import { SaleClientNotFoundException } from '../exceptions/sale-client-not-found.exception';
import { SaleClientInactiveException } from '../exceptions/sale-client-inactive.exception';
import { SalePlanNotFoundException } from '../exceptions/sale-plan-not-found.exception';
import { SaleInvalidProfilesException } from '../exceptions/sale-invalid-profiles.exception';
import { SaleProfilesUnavailableException } from '../exceptions/sale-profiles-unavailable.exception';

/**
 * Crear (runs inside the action's transaction): active client of the company, plan of the company,
 * profiles locked `FOR UPDATE` and checked for coherence + availability, plan snapshot,
 * `endDate = startDate + durationDays` and the pivot rows. The sale starts `pending` (por aprobar): the
 * profiles are NOT occupied and no ledger income is recorded until the seller approves it (`SaleApproveService`).
 *
 * A `profile` plan with N profiles registers N sales (one profile each, all or nothing): the first one
 * keeps `command.id`, the rest get a fresh UUID v7. A `full_account` plan always registers a single sale.
 */
export class SaleCreateService {
  constructor(private readonly repository: SaleRepository) {}

  async execute(command: CreateSaleCommand): Promise<SaleRow[]> {
    const client = await this.repository.findClient(command.clientId, command.companyId);
    if (!client) throw new SaleClientNotFoundException();
    if (client.status !== 'active') throw new SaleClientInactiveException();

    const plan = await this.repository.findPlan(command.planId, command.companyId);
    if (!plan) throw new SalePlanNotFoundException();

    if (new Set(command.profileIds).size !== command.profileIds.length) {
      throw new SaleInvalidProfilesException('Uno o más perfiles no existen.');
    }

    const locked = await this.repository.lockProfiles(command.profileIds);
    const target = {
      companyId: command.companyId,
      serviceId: plan.serviceId,
      capacity: plan.capacity,
      maxProfiles: plan.maxProfiles,
    };
    // Profiles each registered sale occupies: one per profile for `profile` plans, all of them for `full_account`.
    const profileGroups =
      plan.capacity === 'profile' ? command.profileIds.map((id) => [id]) : [[...command.profileIds]];

    for (const group of profileGroups) {
      const incoherence = profileCoherenceError(
        group,
        locked.filter((p) => group.includes(p.id)),
        target,
      );
      if (incoherence) throw new SaleInvalidProfilesException(incoherence);
    }

    const unavailable = unavailableProfiles(locked);
    if (unavailable.length > 0) throw new SaleProfilesUnavailableException(unavailable);

    // Plan snapshot: the sale never reads these values from the plan again.
    const price = Number(plan.salePrice);
    const endDate = saleEndDate(command.startDate, plan.durationDays);

    const created: SaleRow[] = [];
    for (const [index, profileIds] of profileGroups.entries()) {
      const saleId = index === 0 ? command.id : uuidv7();

      await this.repository.create({
        id: saleId,
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
      await this.repository.linkProfiles(saleId, profileIds);

      created.push(await this.repository.findOrFail(saleId, command.companyId));
    }

    return created;
  }
}
