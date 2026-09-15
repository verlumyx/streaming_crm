import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { rolePermissions, roles } from '@/modules/role/models/role.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { updateRoleAction, updateRoleStatusAction } from '@/app/[companyId]/roles/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createCompany } from '../../../factories/company.factory';
import { createRole } from '../../../factories/role.factory';

async function permissionsOf(roleId: string) {
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId))
    .orderBy(asc(rolePermissions.permission));
  return rows.map((r) => r.permission);
}

const update = (companyId: string, id: string, values: Record<string, string>) =>
  updateRoleAction(companyId, id, initialActionState, formData(values));

describe('Actualizar rol', () => {
  beforeEach(resetDb);

  it('editing a role preserves its company and replaces its permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    const role = await createRole(
      db,
      { companyId: company.id, name: 'Manager', description: 'Original' },
      ['clients.list', 'sales.list'],
    );
    setSessionUser(user);

    await expectRedirect(
      update(company.id, role.id, {
        name: 'Manager updated',
        description: 'Updated description',
        permissionType: 'custom',
        permissions: JSON.stringify(['sales.list', 'users.list']),
      }),
      `/${company.id}/roles/${role.id}`,
    );

    const [row] = await db.select().from(roles).where(eq(roles.id, role.id));
    expect(row).toMatchObject({ companyId: company.id, name: 'Manager updated', description: 'Updated description' });
    expect(await permissionsOf(role.id)).toEqual(['sales.list', 'users.list']);
  });

  it('switching a role to all clears its individual permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id }, ['clients.list']);
    setSessionUser(user);

    await expectRedirect(
      update(company.id, role.id, { name: role.name, permissionType: 'all', permissions: JSON.stringify(['clients.list']) }),
      `/${company.id}/roles/${role.id}`,
    );

    const [row] = await db.select().from(roles).where(eq(roles.id, role.id));
    expect(row.permissionType).toBe('all');
    expect(await permissionsOf(role.id)).toEqual([]);
  });

  it('a role keeps its own name but cannot take another role name', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Tomado' });
    const role = await createRole(db, { companyId: company.id, name: 'Mio' });
    setSessionUser(user);

    await expectRedirect(update(company.id, role.id, { name: 'Mio' }), `/${company.id}/roles/${role.id}`);
    const result = await update(company.id, role.id, { name: 'TOMADO' });

    expect(result.fieldErrors?.name?.[0]).toBe('Ya existe un rol con este nombre.');
  });

  it('the Administrador role cannot be edited', async () => {
    const { user, company, role: admin } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await update(company.id, admin.id, {
      name: 'Hacked',
      permissionType: 'custom',
      description: 'changed',
      permissions: '[]',
    });

    expect(result.fieldErrors?.name?.[0]).toBe('El rol Administrador no se puede editar.');
    const [row] = await db.select().from(roles).where(eq(roles.id, admin.id));
    expect(row).toMatchObject({ name: 'Administrador', permissionType: 'all' });
  });

  it('updating a missing or foreign role returns an error', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createRole(db, { companyId: (await createCompany(db)).id, name: 'Ajeno' });
    setSessionUser(user);

    expect(await update(company.id, uuidv7(), { name: 'X' })).toMatchObject({ status: 'error', message: 'Rol no encontrado.' });
    expect(await update(company.id, 'not-a-uuid', { name: 'X' })).toMatchObject({ message: 'Rol no encontrado.' });
    expect(await update(company.id, foreign.id, { name: 'X' })).toMatchObject({ message: 'Rol no encontrado.' });
    const [row] = await db.select().from(roles).where(eq(roles.id, foreign.id));
    expect(row.name).toBe('Ajeno');
  });

  it('a user without roles.update cannot update a role', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['roles.list']);
    const role = await createRole(db, { companyId: company.id, name: 'Original' });
    setSessionUser(user);

    const result = await update(company.id, role.id, { name: 'Renamed', permissionType: 'custom', permissions: '[]' });

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    const [row] = await db.select().from(roles).where(eq(roles.id, role.id));
    expect(row.name).toBe('Original');
  });
});

describe('Actualizar estado del rol', () => {
  beforeEach(resetDb);

  it('a role status can be changed', async () => {
    const { user, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id });
    setSessionUser(user);

    await expectRedirect(updateRoleStatusAction(company.id, role.id, 'inactive'), `/${company.id}/roles`);
    let [row] = await db.select().from(roles).where(eq(roles.id, role.id));
    expect(row.status).toBe('inactive');

    await expectRedirect(updateRoleStatusAction(company.id, role.id, 'active', 'show'), `/${company.id}/roles/${role.id}`);
    [row] = await db.select().from(roles).where(eq(roles.id, role.id));
    expect(row.status).toBe('active');
  });

  it('the Administrador role status cannot be changed', async () => {
    const { user, company, role: admin } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await updateRoleStatusAction(company.id, admin.id, 'inactive');

    expect(result.fieldErrors?.status?.[0]).toBe('El rol Administrador no se puede modificar.');
    const [row] = await db.select().from(roles).where(eq(roles.id, admin.id));
    expect(row.status).toBe('active');
  });

  it('the status must be a valid value', async () => {
    const { user, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id });
    setSessionUser(user);

    const result = await updateRoleStatusAction(company.id, role.id, 'deleted');

    expect(result.fieldErrors?.status?.[0]).toBe('El estado no es válido.');
  });

  it('a user without roles.update-status cannot change a role status', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['roles.list', 'roles.update']);
    const role = await createRole(db, { companyId: company.id });
    setSessionUser(user);

    const result = await updateRoleStatusAction(company.id, role.id, 'inactive');

    expect(result.status).toBe('error');
    const [row] = await db.select().from(roles).where(eq(roles.id, role.id));
    expect(row.status).toBe('active');
  });
});
