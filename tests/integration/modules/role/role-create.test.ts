import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { rolePermissions, roles } from '@/modules/role/models/role.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { createRoleAction } from '@/app/[companyId]/roles/actions';
import RoleCreatePage from '@/app/[companyId]/roles/create/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createCompany } from '../../../factories/company.factory';
import { createRole } from '../../../factories/role.factory';

function create(companyId: string, values: Record<string, string>, id = uuidv7()) {
  return createRoleAction(companyId, initialActionState, formData({ id, ...values }));
}

async function permissionsOf(roleId: string) {
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId))
    .orderBy(asc(rolePermissions.permission));
  return rows.map((r) => r.permission);
}

describe('Crear rol', () => {
  beforeEach(resetDb);

  it('a custom role is created with its permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(
      create(
        company.id,
        {
          name: 'Vendedor',
          description: 'Atiende ventas',
          permissionType: 'custom',
          permissions: JSON.stringify(['sales.list', 'clients.list', 'sales.list']),
        },
        id,
      ),
      `/${company.id}/roles`,
    );

    const [row] = await db.select().from(roles).where(eq(roles.id, id));
    expect(row).toMatchObject({
      companyId: company.id,
      name: 'Vendedor',
      description: 'Atiende ventas',
      permissionType: 'custom',
      status: 'active',
    });
    expect(await permissionsOf(id)).toEqual(['clients.list', 'sales.list']);
  });

  it('an all role stores no individual permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(
      create(company.id, { name: 'Supervisor', permissionType: 'all', permissions: JSON.stringify(['sales.list']) }, id),
      `/${company.id}/roles`,
    );

    const [row] = await db.select().from(roles).where(eq(roles.id, id));
    expect(row.permissionType).toBe('all');
    expect(await permissionsOf(id)).toEqual([]);
  });

  it('the permission type defaults to custom', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(create(company.id, { name: 'Sin tipo' }, id), `/${company.id}/roles`);

    const [row] = await db.select().from(roles).where(eq(roles.id, id));
    expect(row).toMatchObject({ permissionType: 'custom', description: null });
  });

  it('the name is required and limited to 255 characters', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    expect((await create(company.id, { name: '' })).fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect((await create(company.id, { name: 'x'.repeat(256) })).fieldErrors?.name?.[0]).toBe(
      'El nombre no puede superar 255 caracteres.',
    );
    expect((await create(company.id, { name: 'Ok', description: 'x'.repeat(1001) })).fieldErrors?.description?.[0]).toBe(
      'La descripción no puede superar 1000 caracteres.',
    );
  });

  it('the permission type must be all or custom', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await create(company.id, { name: 'Raro', permissionType: 'some' });

    expect(result.fieldErrors?.permissionType?.[0]).toBe('El tipo de permisos no es válido.');
  });

  it('unknown and owner-only permissions are rejected', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const unknown = await create(company.id, { name: 'A', permissions: JSON.stringify(['nope.list']) });
    const ownerOnly = await create(company.id, { name: 'B', permissions: JSON.stringify(['companies.list']) });
    const malformed = await create(company.id, { name: 'C', permissions: 'not-json' });

    expect(unknown.fieldErrors?.permissions?.[0]).toBe('Uno o más permisos no son válidos.');
    expect(ownerOnly.fieldErrors?.permissions?.[0]).toBe('Uno o más permisos no son válidos.');
    expect(malformed.fieldErrors?.permissions?.[0]).toBe('Los permisos no son válidos.');
    expect(await db.select().from(roles).where(eq(roles.companyId, company.id))).toHaveLength(1);
  });

  it('the name must be unique within the company (case-insensitive)', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Editor' });
    setSessionUser(user);

    const duplicated = await create(company.id, { name: 'editor' });
    const administrator = await create(company.id, { name: 'Administrador' });

    expect(duplicated.fieldErrors?.name?.[0]).toBe('Ya existe un rol con este nombre.');
    expect(administrator.fieldErrors?.name?.[0]).toBe('Ya existe un rol con este nombre.');
  });

  it('the same name can exist in another company', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: (await createCompany(db)).id, name: 'Editor' });
    setSessionUser(user);

    await expectRedirect(create(company.id, { name: 'Editor' }), `/${company.id}/roles`);
  });

  it('the create page renders the permissions tree', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const element = await RoleCreatePage({ params: Promise.resolve({ companyId: company.id }) });

    expect(element.props.children.props).toMatchObject({ companyId: company.id, modules: expect.any(Array) });
  });

  it('a user without roles.create cannot open the create view nor store a role', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['roles.list']);
    setSessionUser(user);

    await expectRedirect(
      RoleCreatePage({ params: Promise.resolve({ companyId: company.id }) }),
      `/${company.id}/dashboard?error=forbidden`,
    );

    const result = await create(company.id, { name: 'New role', permissionType: 'custom' });
    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(roles).where(eq(roles.name, 'New role'))).toHaveLength(0);
  });
});
