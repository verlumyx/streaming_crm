import type { CompanyRow } from '@/modules/company/models/company.model';
import type {
  CompanyRepository,
  CompanyServicesSeeder,
} from '@/modules/company/repositories/company.repository';
import type { CreateCompanyCommand } from '@/modules/company/commands/create-company.command';
import type { SearchCompanyCommand } from '@/modules/company/commands/search-company.command';
import type { UpdateCompanyCommand } from '@/modules/company/commands/update-company.command';
import type { UpdateStatusCompanyCommand } from '@/modules/company/commands/update-status-company.command';
import { CompanyNotFoundException } from '@/modules/company/exceptions/company-not-found.exception';

/** In-memory `CompanyRepository` for service unit tests. Records the creation steps in order. */
export class FakeCompanyRepository implements CompanyRepository {
  rows: CompanyRow[] = [];
  roles: Array<{ id: string; companyId: string }> = [];
  memberships: Array<{ userId: string; companyId: string; roleId: string; isDefault: boolean }> = [];
  steps: string[] = [];

  async create(command: CreateCompanyCommand): Promise<void> {
    this.steps.push('company');
    this.rows.push({
      id: command.id,
      name: command.name,
      status: 'active',
      address: null,
      description: command.description,
      phone: null,
      createdBy: command.createdBy,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async findById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async findOrFail(id: string) {
    const row = await this.findById(id);
    if (!row) throw new CompanyNotFoundException();
    return row;
  }

  async update(row: CompanyRow, command: UpdateCompanyCommand) {
    Object.assign(row, { name: command.name, description: command.description });
  }

  async updateStatus(row: CompanyRow, command: UpdateStatusCompanyCommand) {
    row.status = command.status;
  }

  async search(command: SearchCompanyCommand) {
    return { data: this.rows.slice(command.offset, command.offset + command.limit), total: this.rows.length };
  }

  async existsByName(name: string, ignoreId?: string) {
    return this.rows.some((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== ignoreId);
  }

  async createAdministratorRole(companyId: string) {
    this.steps.push('role');
    const id = `role-${this.roles.length + 1}`;
    this.roles.push({ id, companyId });
    return id;
  }

  async createDefaultMembership(userId: string, companyId: string, roleId: string) {
    this.steps.push('membership');
    for (const m of this.memberships) if (m.userId === userId) m.isDefault = false;
    this.memberships.push({ userId, companyId, roleId, isDefault: true });
  }
}

export class FakeCompanyServicesSeeder implements CompanyServicesSeeder {
  seeded: string[] = [];

  constructor(private readonly repository?: FakeCompanyRepository) {}

  async execute(companyId: string) {
    this.repository?.steps.push('services');
    this.seeded.push(companyId);
  }
}
