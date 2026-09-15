import type { ServiceRow } from '../models/service.model';
import type { ServiceRepository } from '../repositories/service.repository';
import type { UpdateStatusServiceCommand } from '../commands/update-status-service.command';
import { ServiceNotFoundException } from '../exceptions/service-not-found.exception';

/** Actualizar Estado: activate / deactivate (never delete). */
export class ServiceUpdateStatusService {
  constructor(private readonly repository: ServiceRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusServiceCommand): Promise<ServiceRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ServiceNotFoundException();

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
