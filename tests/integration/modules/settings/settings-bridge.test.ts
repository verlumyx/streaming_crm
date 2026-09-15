import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import SettingsBridgePage from '@/app/settings/[[...slug]]/page';
import SettingsIndexPage from '@/app/[companyId]/settings/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { addMembership, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createUser } from '../../../factories/user.factory';

const bridge = (slug?: string[]) => SettingsBridgePage({ params: Promise.resolve({ slug }) });

describe('/settings/* bridge', () => {
  beforeEach(resetDb);

  it('redirects /settings/profile to the default company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectRedirect(bridge(['profile']), `/${company.id}/settings/profile`);
    await expectRedirect(bridge(['two-factor']), `/${company.id}/settings/two-factor`);
    await expectRedirect(bridge(['company']), `/${company.id}/settings/company`);
  });

  it('uses the default membership, not the first one', async () => {
    const { user, company } = await createUserWithCompany(db);
    const preferred = await createCompany(db, { createdBy: user.id });
    await addMembership(db, user.id, preferred.id);
    await db.update(userCompanies).set({ isDefault: false }).where(eq(userCompanies.companyId, company.id));
    await db.update(userCompanies).set({ isDefault: true }).where(eq(userCompanies.companyId, preferred.id));
    setSessionUser(user);

    await expectRedirect(bridge(['password']), `/${preferred.id}/settings/password`);
  });

  it('falls back to the profile section for /settings and unknown sections', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expect(bridge()).rejects.toThrow(`NEXT_REDIRECT:/${company.id}/settings/profile`);
    await expect(bridge(['whatever', 'deep'])).rejects.toThrow(`NEXT_REDIRECT:/${company.id}/settings/profile`);
  });

  it('sends users without companies to /no-access and guests to /login', async () => {
    setSessionUser(await createUser(db));
    await expect(bridge(['profile'])).rejects.toThrow('NEXT_REDIRECT:/no-access');

    setSessionUser(null);
    await expect(bridge(['profile'])).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('the company settings index redirects to the profile section', async () => {
    await expect(SettingsIndexPage({ params: Promise.resolve({ companyId: 'c1' }) })).rejects.toThrow(
      'NEXT_REDIRECT:/c1/settings/profile',
    );
  });
});
