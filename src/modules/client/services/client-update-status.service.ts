import type { ClientRow } from '../models/client.model';
import type { ClientRepository } from '../repositories/client.repository';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

/** Actualizar Estado: activate / deactivate (never delete). */
export class ClientUpdateStatusService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusClientCommand): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ClientNotFoundException();

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
