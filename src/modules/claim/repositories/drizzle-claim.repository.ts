import { and, asc, count, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { user } from '@/db/auth-schema';
import { clients } from '@/modules/client/models/client.model';
import { claims, CLAIM_CODE_PREFIX, CLAIM_RESOLVED_STATUSES, type ClaimRow, type NewClaimRow } from '../models/claim.model';
import { ClaimNotFoundException } from '../exceptions/claim-not-found.exception';
import { claimFilters } from './claim.filters';
import type {
  ClaimClientOption,
  ClaimDetail,
  ClaimListItem,
  ClaimRepository,
  NewClaimData,
} from './claim.repository';
import type { UpdateClaimCommand } from '../commands/update-claim.command';
import type { UpdateStatusClaimCommand } from '../commands/update-status-claim.command';
import type { SearchClaimCommand } from '../commands/search-claim.command';

const reporter = alias(user, 'claim_reporter');
const resolver = alias(user, 'claim_resolver');

export class DrizzleClaimRepository implements ClaimRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(data: NewClaimData): Promise<void> {
    await lockCompanySequence(this.db, data.companyId, CLAIM_CODE_PREFIX);
    const code = await generateNextCode(this.db, claims, data.companyId, CLAIM_CODE_PREFIX);

    await this.db.insert(claims).values({
      id: data.id,
      companyId: data.companyId,
      code,
      clientId: data.clientId,
      subject: data.subject,
      description: data.description,
      channel: data.channel,
      status: 'open',
      reportedBy: data.reportedBy,
    });
  }

  private scope(id: string, companyId: string): SQL | undefined {
    return and(eq(claims.id, id), eq(claims.companyId, companyId), isNull(claims.deletedAt));
  }

  private listSelection() {
    return {
      claim: claims,
      client: { id: clients.id, name: clients.name, code: clients.code },
    };
  }

  async findById(id: string, companyId: string): Promise<ClaimDetail | null> {
    const [row] = await this.db
      .select({ ...this.listSelection(), reportedByName: reporter.name, resolvedByName: resolver.name })
      .from(claims)
      .leftJoin(clients, eq(clients.id, claims.clientId))
      .leftJoin(reporter, eq(reporter.id, claims.reportedBy))
      .leftJoin(resolver, eq(resolver.id, claims.resolvedBy))
      .where(this.scope(id, companyId))
      .limit(1);
    if (!row) return null;

    return {
      ...toListItem(row),
      reportedByUser:
        row.claim.reportedBy && row.reportedByName ? { id: row.claim.reportedBy, name: row.reportedByName } : null,
      resolvedByUser:
        row.claim.resolvedBy && row.resolvedByName ? { id: row.claim.resolvedBy, name: row.resolvedByName } : null,
    };
  }

  async findOrFail(id: string, companyId: string): Promise<ClaimDetail> {
    const row = await this.findById(id, companyId);
    if (!row) throw new ClaimNotFoundException();
    return row;
  }

  async lockById(id: string, companyId: string): Promise<ClaimRow | null> {
    const [row] = await this.db.select().from(claims).where(this.scope(id, companyId)).limit(1).for('update');
    return row ?? null;
  }

  async update(row: ClaimRow, command: UpdateClaimCommand): Promise<void> {
    await this.db
      .update(claims)
      .set({
        clientId: command.clientId,
        subject: command.subject,
        description: command.description,
        channel: command.channel,
      })
      .where(eq(claims.id, row.id));
  }

  async updateStatus(row: ClaimRow, command: UpdateStatusClaimCommand): Promise<void> {
    const resolved = CLAIM_RESOLVED_STATUSES.includes(command.status);

    const values: Partial<NewClaimRow> = {
      status: command.status,
      resolvedBy: resolved ? command.resolvedBy : null,
      resolvedAt: resolved ? new Date() : null,
    };
    // `undefined` = el formulario no envió el campo: se conservan las notas guardadas.
    if (command.resolutionNotes !== undefined) values.resolutionNotes = command.resolutionNotes;

    await this.db.update(claims).set(values).where(eq(claims.id, row.id));
  }

  async search(command: SearchClaimCommand): Promise<{ data: ClaimListItem[]; total: number }> {
    const where = and(
      eq(claims.companyId, command.companyId),
      isNull(claims.deletedAt),
      ...applyFilters(claimFilters, command.filters),
    );

    const [{ total }] = await this.db.select({ total: count() }).from(claims).where(where);

    const rows = await this.db
      .select(this.listSelection())
      .from(claims)
      .leftJoin(clients, eq(clients.id, claims.clientId))
      .where(where)
      .orderBy(desc(claims.createdAt), desc(claims.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data: rows.map(toListItem), total };
  }

  private clientSelection() {
    return { id: clients.id, name: clients.name, code: clients.code, status: clients.status };
  }

  async findClient(clientId: string, companyId: string): Promise<ClaimClientOption | null> {
    const [row] = await this.db
      .select(this.clientSelection())
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async listClients(companyId: string, limit: number): Promise<ClaimClientOption[]> {
    return this.db
      .select(this.clientSelection())
      .from(clients)
      .where(eq(clients.companyId, companyId))
      .orderBy(asc(clients.name), asc(clients.id))
      .limit(limit);
  }
}

type ListRow = {
  claim: ClaimRow;
  client: ClaimListItem['client'] | { id: null; name: null; code: null };
};

/** Los left join devuelven un objeto de `null` cuando no hay coincidencia. */
function toListItem(row: ListRow): ClaimListItem {
  return {
    ...row.claim,
    client: row.client && row.client.id ? (row.client as ClaimListItem['client']) : null,
  };
}
