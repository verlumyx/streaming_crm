import { beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { setFlash } from '@/modules/shared/flash/flash';
import { uuidv7 } from '@/modules/shared/uuid';
import { setDefaultCompanyAction } from '@/app/[companyId]/settings/actions';
import SettingsCompanyPage from '@/app/[companyId]/settings/company/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { addMembership, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';

const defaultsOf = async (userId: string) =>
  (
    await db
      .select({ companyId: userCompanies.companyId })
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.isDefault, true)))
  ).map((r) => r.companyId);

describe('Empresa predeterminada', () => {
  beforeEach(async () => {
    vi.mocked(setFlash).mockClear();
    await resetDb();
  });

  it('the default company can be changed and only one stays default', async () => {
    const { user, company } = await createUserWithCompany(db);
    const second = await createCompany(db, { createdBy: user.id });
    await addMembership(db, user.id, second.id);
    // Another member of the same company keeps their own default.
    const { user: otherUser } = await createUserWithCompany(db);
    await addMembership(db, otherUser.id, second.id);
    setSessionUser(user);

    await expectRedirect(setDefaultCompanyAction(company.id, second.id), `/${company.id}/settings/company`);

    expect(await defaultsOf(user.id)).toEqual([second.id]);
    expect(await defaultsOf(otherUser.id)).toHaveLength(1);
    expect(await defaultsOf(otherUser.id)).not.toContain(second.id);
    expect(setFlash).toHaveBeenCalledWith('success', 'Empresa predeterminada actualizada.');
  });

  it('a company the user does not belong to is rejected', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createCompany(db, { createdBy: user.id });
    setSessionUser(user);

    const result = await setDefaultCompanyAction(company.id, foreign.id);

    expect(result).toEqual({ status: 'error', message: 'No perteneces a esta empresa.' });
    expect(await defaultsOf(user.id)).toEqual([company.id]);
    expect(setFlash).not.toHaveBeenCalled();
  });

  it('invalid ids and missing sessions are rejected', async () => {
    const { user, company } = await createUserWithCompany(db);

    setSessionUser(null);
    expect(await setDefaultCompanyAction(company.id, company.id)).toMatchObject({ status: 'error' });

    setSessionUser(user);
    const badTarget = await setDefaultCompanyAction(company.id, 'not-a-uuid');
    expect(badTarget.fieldErrors?.companyId?.[0]).toBe('La empresa no es válida.');
    // The URL company is used to build the redirect: never trust a non-uuid (open redirect).
    expect(await setDefaultCompanyAction('/evil.example', company.id)).toEqual({
      status: 'error',
      message: 'La empresa no es válida.',
    });
    expect(await setDefaultCompanyAction(company.id, uuidv7())).toMatchObject({ status: 'error' });
    expect(await defaultsOf(user.id)).toEqual([company.id]);
  });

  it('the page lists the accessible companies with the default one marked', async () => {
    const { user, company } = await createUserWithCompany(db);
    const second = await createCompany(db, { createdBy: user.id, name: 'ZZ Segunda' });
    const inactive = await createCompany(db, { createdBy: user.id, status: 'inactive' });
    await addMembership(db, user.id, second.id);
    await addMembership(db, user.id, inactive.id);
    setSessionUser(user);

    const element = await SettingsCompanyPage({ params: Promise.resolve({ companyId: company.id }) });

    expect(element.props.companyId).toBe(company.id);
    expect(element.props.companies).toEqual(
      expect.arrayContaining([
        { id: company.id, name: company.name, isDefault: true },
        { id: second.id, name: 'ZZ Segunda', isDefault: false },
      ]),
    );
    expect(element.props.companies).toHaveLength(2);
  });
});
