import type { ClaimRow } from '../models/claim.model';
import type { ClientStatus } from '@/modules/client/models/client.model';
import type { UpdateClaimCommand } from '../commands/update-claim.command';
import type { UpdateStatusClaimCommand } from '../commands/update-status-claim.command';
import type { SearchClaimCommand } from '../commands/search-claim.command';

export type ClaimClientRef = { id: string; name: string; code: string };
export type ClaimUserRef = { id: string; name: string } | null;

/** Un reclamo con el cliente que muestra el listado. */
export type ClaimListItem = ClaimRow & { client: ClaimClientRef | null };

export type ClaimDetail = ClaimListItem & { reportedByUser: ClaimUserRef; resolvedByUser: ClaimUserRef };

/** Cliente seleccionable en el formulario. */
export type ClaimClientOption = ClaimClientRef & { status: ClientStatus };

/** Campos que persiste `create`; el código (`REC000001`) lo genera el repositorio y el estado nace `open`. */
export type NewClaimData = {
  id: string;
  companyId: string;
  clientId: string;
  subject: string;
  description: string;
  channel: ClaimRow['channel'];
  reportedBy: string | null;
};

export interface ClaimRepository {
  /** Debe ejecutarse dentro de una transacción: el código secuencial se genera con `FOR UPDATE`. */
  create(data: NewClaimData): Promise<void>;
  findById(id: string, companyId: string): Promise<ClaimDetail | null>;
  findOrFail(id: string, companyId: string): Promise<ClaimDetail>;
  /** `SELECT … FOR UPDATE` sobre la fila; debe correr dentro de la transacción de la acción. */
  lockById(id: string, companyId: string): Promise<ClaimRow | null>;
  update(row: ClaimRow, command: UpdateClaimCommand): Promise<void>;
  updateStatus(row: ClaimRow, command: UpdateStatusClaimCommand): Promise<void>;
  search(command: SearchClaimCommand): Promise<{ data: ClaimListItem[]; total: number }>;
  findClient(clientId: string, companyId: string): Promise<ClaimClientOption | null>;
  listClients(companyId: string, limit: number): Promise<ClaimClientOption[]>;
}
