import type { ServiceRow } from '../models/service.model';
import type { ServiceRepository } from '../repositories/service.repository';
import type { UpdateServiceCommand } from '../commands/update-service.command';
import { ServiceNotFoundException } from '../exceptions/service-not-found.exception';
import { ServiceNameAlreadyExistsException } from '../exceptions/service-name-already-exists.exception';

/** Actualizar: name, logo and max profiles; a service keeps its own name. */
export class ServiceUpdateService {
  constructor(private readonly repository: ServiceRepository) {}

  async execute(id: string, companyId: string, command: UpdateServiceCommand): Promise<ServiceRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ServiceNotFoundException();

    if (await this.repository.existsByName(command.name, companyId, id)) {
      throw new ServiceNameAlreadyExistsException();
    }

    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
