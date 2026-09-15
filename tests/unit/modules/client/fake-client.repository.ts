import type { ClientRow } from '@/modules/client/models/client.model';
import type {
  ClientMetrics,
  ClientPlatform,
  ClientRepository,
  ClientSaleSummary,
} from '@/modules/client/repositories/client.repository';
import type { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import type { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import type { UpdateClientCommand } from '@/modules/client/commands/update-client.command';
import type { UpdateStatusClientCommand } from '@/modules/client/commands/update-status-client.command';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';

/** In-memory `ClientRepository` for service unit tests. */
export class FakeClientRepository implements ClientRepository {
  rows: ClientRow[] = [];

  async create(command: CreateClientCommand): Promise<void> {
    const sequence = this.rows.filter((r) => r.companyId === command.companyId).length + 1;
    this.rows.push({
      id: command.id,
      companyId: command.companyId,
      code: formatSequentialCode('CLI', sequence),
      name: command.name,
      phone: command.phone,
      email: command.email,
      status: 'active',
      notes: command.notes,
      createdBy: command.createdBy,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async findById(id: string, companyId: string) {
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new ClientNotFoundException();
    return row;
  }

  async update(row: ClientRow, command: UpdateClientCommand) {
    Object.assign(row, { name: command.name, phone: command.phone, email: command.email, notes: command.notes });
  }

  async updateStatus(row: ClientRow, command: UpdateStatusClientCommand) {
    row.status = command.status;
  }

  async search(command: SearchClientCommand) {
    const data = this.rows.filter((r) => r.companyId === command.companyId);
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async existsByEmail(email: string, companyId: string, ignoreId?: string) {
    return this.rows.some(
      (r) => r.companyId === companyId && r.email?.toLowerCase() === email.toLowerCase() && r.id !== ignoreId,
    );
  }

  async activePlatformsByClient(): Promise<Record<string, ClientPlatform[]>> {
    return {};
  }

  async metrics(): Promise<ClientMetrics> {
    return { monthlyIncome: 0, pendingDebt: 0, totalPaid: 0 };
  }

  async currentSales(): Promise<ClientSaleSummary[]> {
    return [];
  }
}
