import type { ServiceRow } from '../models/service.model';
import type { SearchServiceCommand } from '../commands/search-service.command';

export interface ServiceRepository {
  findById(id: string, companyId: string): Promise<ServiceRow | null>;
  findOrFail(id: string, companyId: string): Promise<ServiceRow>;
  search(command: SearchServiceCommand): Promise<{ data: ServiceRow[]; total: number }>;

  /** Active services of the company ordered by name (plan form select). */
  listActive(companyId: string): Promise<ServiceRow[]>;
}
