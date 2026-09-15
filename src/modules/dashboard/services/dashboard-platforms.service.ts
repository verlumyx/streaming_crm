import type { DashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardPlatformDto } from '../serializers/dashboard.serializer';

/** Occupied profiles per service (platform), most occupied first. */
export class DashboardPlatformsService {
  constructor(private readonly repository: DashboardRepository) {}

  execute(companyId: string): Promise<DashboardPlatformDto[]> {
    return this.repository.occupiedProfilesByService(companyId);
  }
}
