import type { ServiceRow } from '../models/service.model';
import type { ServiceRepository } from '../repositories/service.repository';

/** Active services of a company, for selects in other modules (plans). */
export class ServiceListActiveService {
  constructor(private readonly repository: ServiceRepository) {}

  execute(companyId: string): Promise<ServiceRow[]> {
    return this.repository.listActive(companyId);
  }
}
