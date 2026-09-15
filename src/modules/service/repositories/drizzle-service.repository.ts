import { and, asc, count, desc, eq } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { services, type ServiceRow } from '../models/service.model';
import { ServiceNotFoundException } from '../exceptions/service-not-found.exception';
import { serviceFilters } from './service.filters';
import type { ServiceRepository } from './service.repository';
import type { SearchServiceCommand } from '../commands/search-service.command';

export class DrizzleServiceRepository implements ServiceRepository {
  constructor(private readonly db: DbExecutor) {}

  async findById(id: string, companyId: string): Promise<ServiceRow | null> {
    const [row] = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<ServiceRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new ServiceNotFoundException();
    return row;
  }

  async search(command: SearchServiceCommand): Promise<{ data: ServiceRow[]; total: number }> {
    const where = and(eq(services.companyId, command.companyId), ...applyFilters(serviceFilters, command.filters));

    const [{ total }] = await this.db.select({ total: count() }).from(services).where(where);
    const data = await this.db
      .select()
      .from(services)
      .where(where)
      .orderBy(desc(services.createdAt), desc(services.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }

  async listActive(companyId: string): Promise<ServiceRow[]> {
    return this.db
      .select()
      .from(services)
      .where(and(eq(services.companyId, companyId), eq(services.active, true)))
      .orderBy(asc(services.name));
  }
}
