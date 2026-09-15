import type { ServiceRow } from '@/modules/service/models/service.model';
import type { ServiceRepository } from '@/modules/service/repositories/service.repository';
import type { CreateServiceCommand } from '@/modules/service/commands/create-service.command';
import type { SearchServiceCommand } from '@/modules/service/commands/search-service.command';
import type { UpdateServiceCommand } from '@/modules/service/commands/update-service.command';
import type { UpdateStatusServiceCommand } from '@/modules/service/commands/update-status-service.command';
import { ServiceNotFoundException } from '@/modules/service/exceptions/service-not-found.exception';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';

/** In-memory `ServiceRepository` for service unit tests. */
export class FakeServiceRepository implements ServiceRepository {
  rows: ServiceRow[] = [];

  async create(command: CreateServiceCommand): Promise<void> {
    const sequence = this.rows.filter((r) => r.companyId === command.companyId).length + 1;
    this.rows.push({
      id: command.id,
      companyId: command.companyId,
      code: formatSequentialCode('SER', sequence),
      name: command.name,
      logoUrl: command.logoUrl,
      maxProfiles: command.maxProfiles,
      active: true,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async findById(id: string, companyId: string) {
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new ServiceNotFoundException();
    return row;
  }

  async update(row: ServiceRow, command: UpdateServiceCommand) {
    Object.assign(row, { name: command.name, logoUrl: command.logoUrl, maxProfiles: command.maxProfiles });
  }

  async updateStatus(row: ServiceRow, command: UpdateStatusServiceCommand) {
    row.active = command.active;
  }

  async search(command: SearchServiceCommand) {
    const data = this.rows.filter((r) => r.companyId === command.companyId);
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async existsByName(name: string, companyId: string, ignoreId?: string) {
    return this.rows.some(
      (r) => r.companyId === companyId && r.name.toLowerCase() === name.toLowerCase() && r.id !== ignoreId,
    );
  }

  async listActive(companyId: string) {
    return this.rows
      .filter((r) => r.companyId === companyId && r.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
