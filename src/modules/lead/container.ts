import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleLeadRepository } from './repositories/drizzle-lead.repository';
import { LeadCreateService } from './services/lead-create.service';

export function createLeadContainer(db: DbExecutor) {
  const repository = new DrizzleLeadRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new LeadCreateService(repository),
  };
}
