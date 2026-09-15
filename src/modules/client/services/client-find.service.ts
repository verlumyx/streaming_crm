import type { ClientRow } from '../models/client.model';
import type { ClientRepository } from '../repositories/client.repository';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

/** Ver / Editar. */
export class ClientFindService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new ClientNotFoundException();
    return row;
  }
}
