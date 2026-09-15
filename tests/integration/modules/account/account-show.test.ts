import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { profiles } from '@/modules/account/models/account.model';
import { uuidv7 } from '@/modules/shared/uuid';
import AccountShowPage from '@/app/[companyId]/accounts/[id]/page';
import AccountEditPage from '@/app/[companyId]/accounts/[id]/edit/page';
import AccountCreatePage from '@/app/[companyId]/accounts/create/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectNotFound, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { createService } from '../../../factories/catalog.factory';
import { createAccountRenewal } from '../../../factories/account-renewal.factory';
import { makeAccountContext, persistAccount } from './account-context';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver / Editar cuenta', () => {
  beforeEach(resetDb);

  it('the show page renders with profiles, a computed summary and the renewals history', async () => {
    const ctx = await makeAccountContext(db, 4);
    const { account, profiles: rows } = await persistAccount(db, ctx, { notes: 'Nota' });
    await db.update(profiles).set({ status: 'occupied', pin: '1111' }).where(eq(profiles.id, rows[1].id));
    await db.update(profiles).set({ status: 'occupied' }).where(eq(profiles.id, rows[2].id));
    await db.update(profiles).set({ status: 'maintenance' }).where(eq(profiles.id, rows[3].id));
    const purchase = await createAccountRenewal(db, account, { type: 'purchase', paidAt: '2026-06-01' });
    const renewal = await createAccountRenewal(db, account, { type: 'renewal', paidAt: '2026-07-01', amount: '12.50' });
    setSessionUser(ctx.user);

    const element = await AccountShowPage(params(ctx.company.id, account.id));

    expect(element.props.account).toMatchObject({
      id: account.id,
      code: account.code,
      notes: 'Nota',
      service: { id: ctx.service.id, maxProfiles: 4 },
      profilesSummary: { total: 4, available: 1, occupied: 2, maintenance: 1 },
    });
    expect(element.props.profiles.map((p: { number: number; pin: string | null }) => [p.number, p.pin])).toEqual([
      [1, null],
      [2, '1111'],
      [3, null],
      [4, null],
    ]);
    expect(element.props.renewals.map((r: { id: string }) => r.id)).toEqual([renewal.id, purchase.id]);
    expect(element.props.renewals[0]).toMatchObject({ type: 'renewal', amount: 12.5 });
    expect(element.props).toMatchObject({ canUpdate: true, canRenew: true });
  });

  it('the show response never exposes the password', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { password: 'super-hidden' });
    setSessionUser(ctx.user);

    const serialized = JSON.stringify((await AccountShowPage(params(ctx.company.id, account.id))).props);

    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('super-hidden');
    expect(serialized).not.toContain(account.passwordEncrypted);
  });

  it('the permission flags follow the user role', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.show', 'accounts.renew']);
    setSessionUser(ctx.user);

    const element = await AccountShowPage(params(ctx.company.id, account.id));

    expect(element.props).toMatchObject({ canUpdate: false, canRenew: true });
  });

  it('the edit page renders the account, its profiles and its own service as the only option', async () => {
    const ctx = await makeAccountContext(db, 2);
    const { account } = await persistAccount(db, ctx);
    await createService(db, { companyId: ctx.company.id });
    setSessionUser(ctx.user);

    const element = await AccountEditPage(params(ctx.company.id, account.id));
    const edit = element.props.children.props;

    expect(edit.account).toMatchObject({ id: account.id, serviceId: ctx.service.id });
    expect(edit.profiles).toHaveLength(2);
    expect(edit.services).toEqual([
      { id: ctx.service.id, code: ctx.service.code, name: ctx.service.name, maxProfiles: 2 },
    ]);
    expect(JSON.stringify(element.props.children.props)).not.toContain('password');
  });

  it('the create page renders with the active services of the company', async () => {
    const ctx = await makeAccountContext(db, 3);
    await createService(db, { companyId: ctx.company.id, active: false });
    setSessionUser(ctx.user);

    const element = await AccountCreatePage({ params: Promise.resolve({ companyId: ctx.company.id }) });
    const create = element.props.children.props;

    expect(create.services).toEqual([
      { id: ctx.service.id, code: ctx.service.code, name: ctx.service.name, maxProfiles: 3 },
    ]);
    expect(create.initialId).toMatch(/^[0-9a-f-]{36}$/);
    expect(create.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('showing or editing a missing, invalid or foreign account is a 404', async () => {
    const ctx = await makeAccountContext(db);
    const other = await makeAccountContext(db);
    const { account: foreign } = await persistAccount(db, other);
    setSessionUser(ctx.user);

    await expectNotFound(AccountShowPage(params(ctx.company.id, uuidv7())));
    await expectNotFound(AccountShowPage(params(ctx.company.id, 'not-a-uuid')));
    await expectNotFound(AccountShowPage(params(ctx.company.id, foreign.id)));
    await expectNotFound(AccountEditPage(params(ctx.company.id, foreign.id)));
  });
});
