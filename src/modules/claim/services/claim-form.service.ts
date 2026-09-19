import { isUuid } from '@/modules/shared/uuid';
import type { ClaimClientOption, ClaimRepository } from '../repositories/claim.repository';

export const CLAIM_CLIENTS_LIMIT = 200;

export type ClaimForm = { clients: ClaimClientOption[]; preselectedClientId: string | null };

/**
 * Datos del formulario de Crear y Editar: los clientes de la empresa para el selector.
 * El cliente pedido (`?clientId=` o el del reclamo que se edita) se fija primero aunque
 * no entre en el lote inicial.
 */
export class ClaimFormService {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(companyId: string, requestedClientId?: string | null): Promise<ClaimForm> {
    const clients = await this.repository.listClients(companyId, CLAIM_CLIENTS_LIMIT);

    if (!requestedClientId || !isUuid(requestedClientId)) return { clients, preselectedClientId: null };

    const inBatch = clients.find((client) => client.id === requestedClientId);
    if (inBatch) return { clients, preselectedClientId: inBatch.id };

    const requested = await this.repository.findClient(requestedClientId, companyId);
    if (!requested) return { clients, preselectedClientId: null };

    clients.unshift(requested);
    return { clients, preselectedClientId: requested.id };
  }
}
