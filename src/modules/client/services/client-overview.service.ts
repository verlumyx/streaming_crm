import type { ClientRow } from '../models/client.model';
import type { ClientMetrics, ClientRepository, ClientSaleSummary } from '../repositories/client.repository';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

/** Ver (detail page): the client, its active/expired sales with profiles, and its real metrics. */
export class ClientOverviewService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(
    id: string,
    companyId: string,
  ): Promise<{ client: ClientRow; sales: ClientSaleSummary[]; metrics: ClientMetrics }> {
    const client = await this.repository.findById(id, companyId);
    if (!client) throw new ClientNotFoundException();

    const [sales, metrics] = await Promise.all([
      this.repository.currentSales(id, companyId),
      this.repository.metrics(id, companyId),
    ]);
    return { client, sales, metrics };
  }
}
