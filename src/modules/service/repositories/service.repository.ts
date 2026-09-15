import type { ServiceRow } from '../models/service.model';
import type { CreateServiceCommand } from '../commands/create-service.command';
import type { SearchServiceCommand } from '../commands/search-service.command';
import type { UpdateServiceCommand } from '../commands/update-service.command';
import type { UpdateStatusServiceCommand } from '../commands/update-status-service.command';

export interface ServiceRepository {
  create(command: CreateServiceCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<ServiceRow | null>;
  findOrFail(id: string, companyId: string): Promise<ServiceRow>;
  update(row: ServiceRow, command: UpdateServiceCommand): Promise<void>;
  updateStatus(row: ServiceRow, command: UpdateStatusServiceCommand): Promise<void>;
  search(command: SearchServiceCommand): Promise<{ data: ServiceRow[]; total: number }>;

  /** Case-insensitive name lookup inside the company, optionally ignoring one service. */
  existsByName(name: string, companyId: string, ignoreId?: string): Promise<boolean>;
  /** Active services of the company ordered by name (plan form select). */
  listActive(companyId: string): Promise<ServiceRow[]>;
}
