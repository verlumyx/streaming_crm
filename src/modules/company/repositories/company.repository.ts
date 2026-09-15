import type { CompanyRow } from '../models/company.model';
import type { CreateCompanyCommand } from '../commands/create-company.command';
import type { SearchCompanyCommand } from '../commands/search-company.command';
import type { UpdateCompanyCommand } from '../commands/update-company.command';
import type { UpdateStatusCompanyCommand } from '../commands/update-status-company.command';

export interface CompanyRepository {
  create(command: CreateCompanyCommand): Promise<void>;
  findById(id: string): Promise<CompanyRow | null>;
  findOrFail(id: string): Promise<CompanyRow>;
  update(row: CompanyRow, command: UpdateCompanyCommand): Promise<void>;
  updateStatus(row: CompanyRow, command: UpdateStatusCompanyCommand): Promise<void>;
  search(command: SearchCompanyCommand): Promise<{ data: CompanyRow[]; total: number }>;

  /** Case-insensitive, global. */
  existsByName(name: string, ignoreId?: string): Promise<boolean>;
  /** `Administrador` role with `permissionType = 'all'` for the company. Returns the role id. */
  createAdministratorRole(companyId: string): Promise<string>;
  /** Active membership flagged as the user's only default company. */
  createDefaultMembership(userId: string, companyId: string, roleId: string): Promise<void>;
}

/** Preloads the default streaming catalogue (implemented by `SeedCompanyServicesService`). */
export interface CompanyServicesSeeder {
  execute(companyId: string): Promise<void>;
}
