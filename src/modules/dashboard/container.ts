import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleDashboardRepository } from './repositories/drizzle-dashboard.repository';
import { DashboardMetricsService } from './services/dashboard-metrics.service';
import { DashboardRevenueService } from './services/dashboard-revenue.service';
import { DashboardOccupancyService } from './services/dashboard-occupancy.service';
import { DashboardPlatformsService } from './services/dashboard-platforms.service';
import { DashboardExpirationsService } from './services/dashboard-expirations.service';

export function createDashboardContainer(db: DbExecutor) {
  const repository = new DrizzleDashboardRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    metricsService: new DashboardMetricsService(repository),
    revenueService: new DashboardRevenueService(repository),
    occupancyService: new DashboardOccupancyService(repository),
    platformsService: new DashboardPlatformsService(repository),
    expirationsService: new DashboardExpirationsService(repository),
  };
}
