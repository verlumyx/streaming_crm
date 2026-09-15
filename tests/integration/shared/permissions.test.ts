import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { setSessionUser, expectRedirect } from '../../helpers/session-mock';
import { hasPermission, getUserPermissions, requirePermission, guardPage } from '@/modules/shared/auth/require-permission';
import { requireCompanyAccess } from '@/modules/shared/auth/require-company-access';
import { resetDb } from '../../helpers/reset-db';
import { createUserWithCompany, assignRoleWithPermissions, addMembership } from '../../helpers/company-context';
import { createCompany } from '../../factories/company.factory';
import { seedPermissions } from '@/db/seed/registries';

describe('permissions', () => {
  beforeEach(async () => {
    await resetDb();
    await seedPermissions(db);
  });

  it('a permissionType=all role passes every check and lists all actions except companies.*', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    expect(await hasPermission(company.id, 'sales.create')).toBe(true);
    expect(await hasPermission(company.id, 'anything.at-all')).toBe(true);

    const list = await getUserPermissions(company.id);
    expect(list).toContain('sales.create');
    expect(list.some((a) => a.startsWith('companies.'))).toBe(false);
  });

  it('a custom role only passes its own actions', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.list']);
    setSessionUser(user);

    expect(await hasPermission(company.id, 'clients.list')).toBe(true);
    expect(await hasPermission(company.id, 'clients.create')).toBe(false);
    await expect(requirePermission(company.id, 'clients.create')).rejects.toThrow();
    await expectRedirect(guardPage(company.id, 'clients.create'), `/${company.id}/dashboard?error=forbidden`);
  });

  it('permissions are per company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db, { createdBy: user.id });
    await addMembership(db, user.id, other.id, { roleId: null });
    setSessionUser(user);

    expect(await hasPermission(company.id, 'clients.list')).toBe(true);
    expect(await hasPermission(other.id, 'clients.list')).toBe(false);
  });
});

describe('requireCompanyAccess', () => {
  beforeEach(resetDb);

  it('grants access to an active member of an active company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const ctx = await requireCompanyAccess(company.id);
    expect(ctx.company.id).toBe(company.id);
  });

  it('redirects non-members to the dashboard bridge with forbidden', async () => {
    const { user } = await createUserWithCompany(db);
    const foreign = await createCompany(db);
    setSessionUser(user);
    await expectRedirect(requireCompanyAccess(foreign.id), '/dashboard?error=forbidden');
  });

  it('redirects to a fallback active company when the requested one is inactive', async () => {
    const { user, company } = await createUserWithCompany(db);
    const inactive = await createCompany(db, { createdBy: user.id, status: 'inactive' });
    await addMembership(db, user.id, inactive.id);
    setSessionUser(user);
    await expectRedirect(requireCompanyAccess(inactive.id), `/${company.id}/dashboard?error=company-inactive`);
  });

  it('sends users without any active company to /no-access', async () => {
    const { user, company } = await createUserWithCompany(db, { companyStatus: 'inactive' });
    setSessionUser(user);
    await expectRedirect(requireCompanyAccess(company.id), '/no-access');
  });

  it('lets a system owner into an inactive company', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true, companyStatus: 'inactive' });
    setSessionUser(user);
    const ctx = await requireCompanyAccess(company.id);
    expect(ctx.company.status).toBe('inactive');
  });
});
