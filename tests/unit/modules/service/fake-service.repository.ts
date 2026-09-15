import type { ServiceRow } from '@/modules/service/models/service.model';
import type { ServiceRepository } from '@/modules/service/repositories/service.repository';
import type { SearchServiceCommand } from '@/modules/service/commands/search-service.command';
import { ServiceNotFoundException } from '@/modules/service/exceptions/service-not-found.exception';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';

/** In-memory `ServiceRepository` for service unit tests. */
export class FakeServiceRepository implements ServiceRepository {
  rows: ServiceRow[] = [];

  /** Test helper: services are preset (seeded), the repository itself has no create. */
  add(values: Pick<ServiceRow, 'id' | 'companyId' | 'name'> & Partial<ServiceRow>): ServiceRow {
    const sequence = this.rows.filter((r) => r.companyId === values.companyId).length + 1;
    const row: ServiceRow = {
      code: formatSequentialCode('SER', sequence),
      logoUrl: null,
      maxProfiles: 5,
      active: true,
      createdAt: new Date(),
      updatedAt: null,
      ...values,
    };
    this.rows.push(row);
    return row;
  }

  async findById(id: string, companyId: string) {
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new ServiceNotFoundException();
    return row;
  }

  async search(command: SearchServiceCommand) {
    const data = this.rows.filter((r) => r.companyId === command.companyId);
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async listActive(companyId: string) {
    return this.rows
      .filter((r) => r.companyId === companyId && r.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
