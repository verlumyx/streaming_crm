import type { DashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardOccupancyDto } from '../serializers/dashboard.serializer';

/** Profile inventory of the company broken down by status. */
export class DashboardOccupancyService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(companyId: string): Promise<DashboardOccupancyDto> {
    const { occupied, available, maintenance } = await this.repository.profileCountsByStatus(companyId);
    return { occupied, available, maintenance, total: occupied + available + maintenance };
  }
}
