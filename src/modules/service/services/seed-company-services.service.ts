import { streamingConfig, serviceLogoUrl } from '@/config/streaming';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { services, SERVICE_CODE_PREFIX } from '../models/service.model';

/** Preloads the default streaming catalogue into a freshly created company. Runs inside the caller's transaction. */
export class SeedCompanyServicesService {
  constructor(private readonly db: DbExecutor) {}

  async execute(companyId: string): Promise<void> {
    await lockCompanySequence(this.db, companyId, SERVICE_CODE_PREFIX);

    for (const entry of streamingConfig.defaultServices) {
      const code = await generateNextCode(this.db, services, companyId, SERVICE_CODE_PREFIX);
      await this.db.insert(services).values({
        id: uuidv7(),
        companyId,
        code,
        name: entry.name,
        logoUrl: serviceLogoUrl(entry.slug),
        maxProfiles: entry.maxProfiles,
        active: true,
      });
    }
  }
}
