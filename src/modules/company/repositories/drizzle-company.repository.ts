import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { uuidv7 } from '@/modules/shared/uuid';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { roles, ADMINISTRATOR_ROLE_NAME } from '@/modules/role/models/role.model';
import { companies, type CompanyRow } from '../models/company.model';
import { CompanyNotFoundException } from '../exceptions/company-not-found.exception';
import { CompanyNameAlreadyExistsException } from '../exceptions/company-name-already-exists.exception';
import { companyFilters } from './company.filters';
import type { CompanyRepository } from './company.repository';
import type { CreateCompanyCommand } from '../commands/create-company.command';
import type { SearchCompanyCommand } from '../commands/search-company.command';
import type { UpdateCompanyCommand } from '../commands/update-company.command';
import type { UpdateStatusCompanyCommand } from '../commands/update-status-company.command';

const NAME_UNIQUE_CONSTRAINT = 'app_companies_name_unique';

/** A concurrent insert can still hit the DB unique index after the service check: map it to the same field error. */
function isNameUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some((e) => {
    const pg = e as { code?: string; constraint_name?: string; constraint?: string } | null;
    return pg?.code === '23505' && (pg.constraint_name ?? pg.constraint) === NAME_UNIQUE_CONSTRAINT;
  });
}

export class DrizzleCompanyRepository implements CompanyRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateCompanyCommand): Promise<void> {
    try {
      await this.db.insert(companies).values({
        id: command.id,
        name: command.name,
        description: command.description,
        status: 'active',
        createdBy: command.createdBy,
      });
    } catch (error) {
      if (isNameUniqueViolation(error)) throw new CompanyNameAlreadyExistsException();
      throw error;
    }
  }

  async findById(id: string): Promise<CompanyRow | null> {
    const [row] = await this.db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return row ?? null;
  }

  async findOrFail(id: string): Promise<CompanyRow> {
    const row = await this.findById(id);
    if (!row) throw new CompanyNotFoundException();
    return row;
  }

  async update(row: CompanyRow, command: UpdateCompanyCommand): Promise<void> {
    try {
      await this.db
        .update(companies)
        .set({ name: command.name, description: command.description })
        .where(eq(companies.id, row.id));
    } catch (error) {
      if (isNameUniqueViolation(error)) throw new CompanyNameAlreadyExistsException();
      throw error;
    }
  }

  async updateStatus(row: CompanyRow, command: UpdateStatusCompanyCommand): Promise<void> {
    await this.db.update(companies).set({ status: command.status }).where(eq(companies.id, row.id));
  }

  async search(command: SearchCompanyCommand): Promise<{ data: CompanyRow[]; total: number }> {
    const where = and(...applyFilters(companyFilters, command.filters));

    const [{ total }] = await this.db.select({ total: count() }).from(companies).where(where);
    const data = await this.db
      .select()
      .from(companies)
      .where(where)
      .orderBy(desc(companies.createdAt), desc(companies.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }

  async existsByName(name: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(
          sql`lower(${companies.name}) = lower(${name})`,
          ignoreId ? ne(companies.id, ignoreId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async createAdministratorRole(companyId: string): Promise<string> {
    const id = uuidv7();
    await this.db.insert(roles).values({
      id,
      companyId,
      name: ADMINISTRATOR_ROLE_NAME,
      status: 'active',
      permissionType: 'all',
      description: 'Rol administrador de la empresa',
    });
    return id;
  }

  async createDefaultMembership(userId: string, companyId: string, roleId: string): Promise<void> {
    await this.db
      .update(userCompanies)
      .set({ isDefault: false })
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.isDefault, true)));

    await this.db.insert(userCompanies).values({
      id: uuidv7(),
      userId,
      companyId,
      roleId,
      status: 'active',
      isDefault: true,
    });
  }
}
