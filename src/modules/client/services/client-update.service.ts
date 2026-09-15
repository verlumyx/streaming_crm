import type { ClientRow } from '../models/client.model';
import type { ClientRepository } from '../repositories/client.repository';
import type { UpdateClientCommand } from '../commands/update-client.command';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';
import { ClientEmailAlreadyExistsException } from '../exceptions/client-email-already-exists.exception';

/** Actualizar: contact data only; a client keeps its own email. */
export class ClientUpdateService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string, command: UpdateClientCommand): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ClientNotFoundException();

    if (command.email && (await this.repository.existsByEmail(command.email, companyId, id))) {
      throw new ClientEmailAlreadyExistsException();
    }

    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
