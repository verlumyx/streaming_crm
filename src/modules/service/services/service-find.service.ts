import type { ServiceRow } from '../models/service.model';
import type { ServiceRepository } from '../repositories/service.repository';
import { ServiceNotFoundException } from '../exceptions/service-not-found.exception';

/** Ver / Editar. */
export class ServiceFindService {
  constructor(private readonly repository: ServiceRepository) {}

  async execute(id: string, companyId: string): Promise<ServiceRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ServiceNotFoundException();
    return row;
  }
}
