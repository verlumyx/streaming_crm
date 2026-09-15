import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { services, SERVICE_CODE_PREFIX, type ServiceRow } from '../models/service.model';
import { ServiceNotFoundException } from '../exceptions/service-not-found.exception';
import { serviceFilters } from './service.filters';
import type { ServiceRepository } from './service.repository';
import type { CreateServiceCommand } from '../commands/create-service.command';
import type { SearchServiceCommand } from '../commands/search-service.command';
import type { UpdateServiceCommand } from '../commands/update-service.command';
import type { UpdateStatusServiceCommand } from '../commands/update-status-service.command';

export class DrizzleServiceRepository implements ServiceRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateServiceCommand): Promise<void> {
    await lockCompanySequence(this.db, command.companyId, SERVICE_CODE_PREFIX);
    const code = await generateNextCode(this.db, services, command.companyId, SERVICE_CODE_PREFIX);

    await this.db.insert(services).values({
      id: command.id,
      companyId: command.companyId,
      code,
      name: command.name,
      logoUrl: command.logoUrl,
      maxProfiles: command.maxProfiles,
      active: true,
    });
  }

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

  async update(row: ServiceRow, command: UpdateServiceCommand): Promise<void> {
    await this.db
      .update(services)
      .set({ name: command.name, logoUrl: command.logoUrl, maxProfiles: command.maxProfiles })
      .where(eq(services.id, row.id));
  }

  async updateStatus(row: ServiceRow, command: UpdateStatusServiceCommand): Promise<void> {
    await this.db.update(services).set({ active: command.active }).where(eq(services.id, row.id));
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

  async existsByName(name: string, companyId: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.companyId, companyId),
          sql`lower(${services.name}) = lower(${name})`,
          ignoreId ? ne(services.id, ignoreId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async listActive(companyId: string): Promise<ServiceRow[]> {
    return this.db
      .select()
      .from(services)
      .where(and(eq(services.companyId, companyId), eq(services.active, true)))
      .orderBy(asc(services.name));
  }
}
