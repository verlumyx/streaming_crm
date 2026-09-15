import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import RolesPage from '@/app/[companyId]/roles/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createRole } from '../../../factories/role.factory';

async function renderIndex(companyId: string, searchParams: Record<string, string> = {}) {
  return RolesPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });
}

const names = (element: Awaited<ReturnType<typeof renderIndex>>) =>
  element.props.roles.map((r: { name: string }) => r.name).sort();

describe('Listar roles', () => {
  beforeEach(resetDb);

  it('the roles index renders with the company roles', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Editor' });
    setSessionUser(user);

    const element = await renderIndex(company.id);

    expect(names(element)).toEqual(['Administrador', 'Editor']);
    expect(element.props.meta).toMatchObject({ total: 2, limit: 20, offset: 0, hasMore: false });
    const admin = element.props.roles.find((r: { name: string }) => r.name === 'Administrador');
    expect(admin).toMatchObject({ isAdministrator: true, permissionType: 'all', status: 'active' });
  });

  it('roles can be filtered by name', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Editor' });
    await createRole(db, { companyId: company.id, name: 'Viewer' });
    setSessionUser(user);

    expect(names(await renderIndex(company.id, { name: 'Editor' }))).toEqual(['Editor']);
  });

  it('roles can be filtered by status', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Inactive Role', status: 'inactive' });
    setSessionUser(user);

    expect(names(await renderIndex(company.id, { status: 'inactive' }))).toEqual(['Inactive Role']);
    expect((await renderIndex(company.id, { status: 'todos' })).props.meta.total).toBe(2);
  });

  it('roles can be filtered by description', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Alpha', description: 'handles billing' });
    await createRole(db, { companyId: company.id, name: 'Beta', description: 'handles support' });
    setSessionUser(user);

    expect(names(await renderIndex(company.id, { description: 'billing' }))).toEqual(['Alpha']);
  });

  it('role field filters combine with AND', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Support', description: 'tickets' });
    await createRole(db, { companyId: company.id, name: 'Helpdesk', description: 'tickets' });
    setSessionUser(user);

    expect(names(await renderIndex(company.id, { name: 'Support', description: 'tickets' }))).toEqual(['Support']);
  });

  it('the index only shows roles from the active company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    await createRole(db, { companyId: other.id, name: 'Ajeno' });
    setSessionUser(user);

    const element = await renderIndex(company.id);

    expect(names(element)).toEqual(['Administrador']);
    expect(element.props.companyId).toBe(company.id);
  });

  it('a user without roles.list cannot open the roles index', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, []);
    setSessionUser(user);

    await expectRedirect(renderIndex(company.id), `/${company.id}/dashboard?error=forbidden`);
  });
});
