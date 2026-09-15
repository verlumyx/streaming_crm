import type { ClientRow } from '../models/client.model';
import type { ClientPlatform, ClientRepository } from '../repositories/client.repository';
import type { SearchClientCommand } from '../commands/search-client.command';

/** Listar: page of clients plus the platforms each one has through active sales. */
export class ClientSearchService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(
    command: SearchClientCommand,
  ): Promise<{ data: ClientRow[]; total: number; platforms: Record<string, ClientPlatform[]> }> {
    const { data, total } = await this.repository.search(command);
    const platforms = await this.repository.activePlatformsByClient(
      data.map((c) => c.id),
      command.companyId,
    );
    return { data, total, platforms };
  }
}
