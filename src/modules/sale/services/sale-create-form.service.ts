import { isUuid } from '@/modules/shared/uuid';
import type {
  SaleAvailableProfile,
  SaleClientOption,
  SalePlanOption,
  SaleRepository,
} from '../repositories/sale.repository';
import { SALE_CLIENT_SEARCH_LIMIT } from './sale-client-search.service';

export type SaleCreateForm = {
  clients: SaleClientOption[];
  plans: SalePlanOption[];
  availableProfiles: SaleAvailableProfile[];
  preselectedClientId: string | null;
};

/**
 * Crear (wizard data): initial batch of active clients (the requested client is pinned first even when it is
 * not in the batch), active plans with their service, and the company's available profiles.
 */
export class SaleCreateFormService {
  constructor(private readonly repository: SaleRepository) {}

  async execute(companyId: string, requestedClientId?: string | null): Promise<SaleCreateForm> {
    const [clients, plans, availableProfiles] = await Promise.all([
      this.repository.searchActiveClients(companyId, '', SALE_CLIENT_SEARCH_LIMIT),
      this.repository.listActivePlans(companyId),
      this.repository.listAvailableProfiles(companyId),
    ]);

    let preselectedClientId: string | null = null;
    if (requestedClientId && isUuid(requestedClientId)) {
      const inBatch = clients.find((c) => c.id === requestedClientId);
      const requested = inBatch ?? (await this.repository.findClient(requestedClientId, companyId));
      if (requested && requested.status === 'active') {
        preselectedClientId = requested.id;
        if (!inBatch) clients.unshift(requested);
      }
    }

    return { clients, plans, availableProfiles, preselectedClientId };
  }
}
