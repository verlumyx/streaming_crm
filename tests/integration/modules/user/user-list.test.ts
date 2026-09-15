import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import UsersPage from '@/app/[companyId]/users/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { addMembership, assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createUser } from '../../../factories/user.factory';
import { createRole } from '../../../factories/role.factory';

function renderIndex(companyId: string, searchParams: Record<string, string> = {}) {
  return UsersPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });
}

const ids = (element: Awaited<ReturnType<typeof renderIndex>>) =>
  element.props.users.map((u: { id: string }) => u.id).sort();

describe('Listar usuarios', () => {
  beforeEach(resetDb);

  it('the users index only lists users assigned to the active company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const sameCompanyUser = await createUser(db, { name: 'Same Company' });
    await addMembership(db, sameCompanyUser.id, company.id);
    const otherCompany = await createCompany(db, { createdBy: user.id });
    const otherCompanyUser = await createUser(db, { name: 'Other Company User' });
    await addMembership(db, otherCompanyUser.id, otherCompany.id);
    setSessionUser(user);

    const element = await renderIndex(company.id);

    expect(element.props.meta.total).toBe(2);
    expect(ids(element)).toEqual([user.id, sameCompanyUser.id].sort());
  });

  it('each user shows its membership status and role in this company', async () => {
    const { user, company, role } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const member = await createUser(db, { name: 'Sin Rol', emailVerified: false });
    await addMembership(db, member.id, company.id, { status: 'inactive' });
    const otherRole = await createRole(db, { companyId: other.id, name: 'Ajeno' });
    await addMembership(db, member.id, other.id, { roleId: otherRole.id, status: 'active' });
    setSessionUser(user);

    const element = await renderIndex(company.id);
    const byId = Object.fromEntries(element.props.users.map((u: { id: string }) => [u.id, u]));

    expect(byId[user.id]).toMatchObject({ status: 'active', role: { id: role.id, name: 'Administrador' } });
    expect(byId[member.id]).toMatchObject({ status: 'inactive', role: null, emailVerified: false });
  });

  it('users can be filtered by name', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const target = await createUser(db, { name: 'Findable User' });
    await addMembership(db, target.id, company.id);
    const other = await createUser(db, { name: 'Someone Else' });
    await addMembership(db, other.id, company.id);
    setSessionUser(actor);

    expect(ids(await renderIndex(company.id, { name: 'Findable' }))).toEqual([target.id]);
  });

  it('users can be filtered by email', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const target = await createUser(db, { email: 'target@acme.test' });
    await addMembership(db, target.id, company.id);
    const other = await createUser(db, { email: 'other@acme.test' });
    await addMembership(db, other.id, company.id);
    setSessionUser(actor);

    expect(ids(await renderIndex(company.id, { email: 'target@' }))).toEqual([target.id]);
  });

  it('users can be filtered by email verification', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const unverified = await createUser(db, { name: 'Pending User', emailVerified: false });
    await addMembership(db, unverified.id, company.id);
    const verified = await createUser(db, { name: 'Verified User', emailVerified: true });
    await addMembership(db, verified.id, company.id);
    setSessionUser(actor);

    expect(ids(await renderIndex(company.id, { emailVerified: 'unverified' }))).toEqual([unverified.id]);
    expect(ids(await renderIndex(company.id, { emailVerified: 'verified' }))).toEqual([actor.id, verified.id].sort());
    expect((await renderIndex(company.id, { emailVerified: 'all' })).props.meta.total).toBe(3);
  });

  it('a user without users.list cannot open the users index', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, []);
    setSessionUser(user);

    await expectRedirect(renderIndex(company.id), `/${company.id}/dashboard?error=forbidden`);
  });
});
