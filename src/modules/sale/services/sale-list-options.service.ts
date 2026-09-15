import type {
  SaleAgentOption,
  SaleClientOption,
  SaleRepository,
  SaleServiceOption,
} from '../repositories/sale.repository';

export type SaleListOptions = { clients: SaleClientOption[]; services: SaleServiceOption[]; agents: SaleAgentOption[] };

/** Listar: clients, services and agents (users with membership) of the company for the filter selects. */
export class SaleListOptionsService {
  constructor(private readonly repository: SaleRepository) {}

  async execute(companyId: string): Promise<SaleListOptions> {
    const [clients, services, agents] = await Promise.all([
      this.repository.listClients(companyId),
      this.repository.listServices(companyId),
      this.repository.listAgents(companyId),
    ]);
    return { clients, services, agents };
  }
}
