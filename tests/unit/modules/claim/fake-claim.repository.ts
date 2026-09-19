import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { CLAIM_CODE_PREFIX, CLAIM_RESOLVED_STATUSES, type ClaimRow } from '@/modules/claim/models/claim.model';
import type {
  ClaimClientOption,
  ClaimDetail,
  ClaimListItem,
  ClaimRepository,
  NewClaimData,
} from '@/modules/claim/repositories/claim.repository';
import type { UpdateClaimCommand } from '@/modules/claim/commands/update-claim.command';
import type { UpdateStatusClaimCommand } from '@/modules/claim/commands/update-status-claim.command';
import type { SearchClaimCommand } from '@/modules/claim/commands/search-claim.command';
import { ClaimNotFoundException } from '@/modules/claim/exceptions/claim-not-found.exception';

/** `ClaimRepository` en memoria para los tests unitarios de servicios. */
export class FakeClaimRepository implements ClaimRepository {
  rows: ClaimRow[] = [];
  clients: (ClaimClientOption & { companyId: string })[] = [];
  locks: string[] = [];

  async create(data: NewClaimData) {
    const sequence = this.rows.filter((r) => r.companyId === data.companyId).length + 1;
    this.rows.push({
      id: data.id,
      companyId: data.companyId,
      code: formatSequentialCode(CLAIM_CODE_PREFIX, sequence),
      clientId: data.clientId,
      subject: data.subject,
      description: data.description,
      channel: data.channel,
      status: 'open',
      resolutionNotes: null,
      reportedBy: data.reportedBy,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
    });
  }

  private toDetail(row: ClaimRow): ClaimDetail {
    const client = this.clients.find((c) => c.id === row.clientId);
    return {
      ...row,
      client: client ? { id: client.id, name: client.name, code: client.code } : null,
      reportedByUser: null,
      resolvedByUser: null,
    };
  }

  async findById(id: string, companyId: string): Promise<ClaimDetail | null> {
    const row = this.rows.find((r) => r.id === id && r.companyId === companyId);
    return row ? this.toDetail(row) : null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new ClaimNotFoundException();
    return row;
  }

  async lockById(id: string, companyId: string) {
    this.locks.push(id);
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async update(row: ClaimRow, command: UpdateClaimCommand) {
    Object.assign(row, {
      clientId: command.clientId,
      subject: command.subject,
      description: command.description,
      channel: command.channel,
      updatedAt: new Date(),
    });
  }

  async updateStatus(row: ClaimRow, command: UpdateStatusClaimCommand) {
    const resolved = CLAIM_RESOLVED_STATUSES.includes(command.status);
    Object.assign(row, {
      status: command.status,
      resolvedBy: resolved ? command.resolvedBy : null,
      resolvedAt: resolved ? new Date() : null,
      updatedAt: new Date(),
      ...(command.resolutionNotes !== undefined ? { resolutionNotes: command.resolutionNotes } : {}),
    });
  }

  async search(command: SearchClaimCommand): Promise<{ data: ClaimListItem[]; total: number }> {
    const data = this.rows.filter((r) => r.companyId === command.companyId).map((r) => this.toDetail(r));
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async findClient(clientId: string, companyId: string): Promise<ClaimClientOption | null> {
    return this.clients.find((c) => c.id === clientId && c.companyId === companyId) ?? null;
  }

  async listClients(companyId: string, limit: number): Promise<ClaimClientOption[]> {
    return this.clients.filter((c) => c.companyId === companyId).slice(0, limit);
  }
}
