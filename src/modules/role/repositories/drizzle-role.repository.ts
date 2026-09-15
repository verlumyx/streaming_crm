import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { uuidv7 } from '@/modules/shared/uuid';
import { rolePermissions, roles, type RoleRow } from '../models/role.model';
import { RoleNotFoundException } from '../exceptions/role-not-found.exception';
import { roleFilters } from './role.filters';
import type { RoleOption, RoleRepository, RoleWithPermissions } from './role.repository';
import type { CreateRoleCommand } from '../commands/create-role.command';
import type { SearchRoleCommand } from '../commands/search-role.command';
import type { UpdateRoleCommand } from '../commands/update-role.command';
import type { UpdateStatusRoleCommand } from '../commands/update-status-role.command';

export class DrizzleRoleRepository implements RoleRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateRoleCommand): Promise<void> {
    await this.db.insert(roles).values({
      id: command.id,
      companyId: command.companyId,
      name: command.name,
      description: command.description,
      permissionType: command.permissionType,
      status: 'active',
    });
    await this.insertPermissions(command.id, command.permissionType === 'custom' ? command.permissions : []);
  }

  async findById(id: string, companyId: string): Promise<RoleWithPermissions | null> {
    const [row] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.companyId, companyId)))
      .limit(1);
    if (!row) return null;

    const granted = await this.db
      .select({ permission: rolePermissions.permission })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id))
      .orderBy(asc(rolePermissions.permission));

    return { ...row, permissions: granted.map((p) => p.permission) };
  }

  async findOrFail(id: string, companyId: string): Promise<RoleWithPermissions> {
    const row = await this.findById(id, companyId);
    if (!row) throw new RoleNotFoundException();
    return row;
  }

  async update(row: RoleRow, command: UpdateRoleCommand): Promise<void> {
    await this.db
      .update(roles)
      .set({ name: command.name, description: command.description, permissionType: command.permissionType })
      .where(eq(roles.id, row.id));

    // no-delete-policy exception: `app_role_permissions` is a join table (role ↔ action string), not an entity.
    // Saving a role replaces its whole permission set; the role itself is never deleted. Runs inside the action's tx.
    await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, row.id));
    await this.insertPermissions(row.id, command.permissionType === 'custom' ? command.permissions : []);
  }

  async updateStatus(row: RoleRow, command: UpdateStatusRoleCommand): Promise<void> {
    await this.db.update(roles).set({ status: command.status }).where(eq(roles.id, row.id));
  }

  async search(command: SearchRoleCommand): Promise<{ data: RoleRow[]; total: number }> {
    const where = and(eq(roles.companyId, command.companyId), ...applyFilters(roleFilters, command.filters));

    const [{ total }] = await this.db.select({ total: count() }).from(roles).where(where);
    const data = await this.db
      .select()
      .from(roles)
      .where(where)
      .orderBy(desc(roles.createdAt), desc(roles.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }

  async existsByName(name: string, companyId: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.companyId, companyId),
          sql`lower(${roles.name}) = lower(${name})`,
          ignoreId ? ne(roles.id, ignoreId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async listActive(companyId: string): Promise<RoleOption[]> {
    return this.db
      .select({ id: roles.id, name: roles.name, description: roles.description })
      .from(roles)
      .where(and(eq(roles.companyId, companyId), eq(roles.status, 'active')))
      .orderBy(asc(roles.name));
  }

  private async insertPermissions(roleId: string, actions: readonly string[]): Promise<void> {
    if (actions.length === 0) return;
    await this.db
      .insert(rolePermissions)
      .values([...new Set(actions)].map((permission) => ({ id: uuidv7(), roleId, permission })));
  }
}
