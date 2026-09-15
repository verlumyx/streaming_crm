import type { ServiceRow } from '../models/service.model';
import type { ServiceRepository } from '../repositories/service.repository';
import type { SearchServiceCommand } from '../commands/search-service.command';

/** Listar. */
export class ServiceSearchService {
  constructor(private readonly repository: ServiceRepository) {}

  execute(command: SearchServiceCommand): Promise<{ data: ServiceRow[]; total: number }> {
    return this.repository.search(command);
  }
}
