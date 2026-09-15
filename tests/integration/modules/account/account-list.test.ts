import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { profiles } from '@/modules/account/models/account.model';
import { createAccountContainer } from '@/modules/account/container';
import { SearchAccountCommand } from '@/modules/account/commands/search-account.command';
import { searchAccountSchema } from '@/modules/account/validation/search-account.schema';
import AccountsPage from '@/app/[companyId]/accounts/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { createService } from '../../../factories/catalog.factory';
import { makeAccountContext, persistAccount } from './account-context';

function search(companyId: string, query: Record<string, string> = {}) {
  const command = SearchAccountCommand.fromInput(searchAccountSchema.parse(query), companyId);
  return createAccountContainer(db).searchService.execute(command);
}

const page = (companyId: string, searchParams: Record<string, string> = {}) =>
  AccountsPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });

describe('Listar cuentas', () => {
  beforeEach(resetDb);

  it('the index lists only accounts of the current company with the active services', async () => {
    const ctx = await makeAccountContext(db, 3);
    const other = await makeAccountContext(db, 3);
    await persistAccount(db, ctx);
    await persistAccount(db, ctx);
    await persistAccount(db, other);
    await createService(db, { companyId: ctx.company.id, active: false, name: 'Inactivo' });
    setSessionUser(ctx.user);

    const element = await page(ctx.company.id);

    expect(element.props.accounts).toHaveLength(2);
    expect(element.props.meta).toMatchObject({ total: 2, limit: 10, offset: 0, hasMore: false });
    expect(element.props.services.map((s: { id: string }) => s.id)).toEqual([ctx.service.id]);
  });

  it('each row exposes its service and profile availability but never the password', async () => {
    const ctx = await makeAccountContext(db, 4);
    const { account, profiles: rows } = await persistAccount(db, ctx, { password: 'hidden-secret' });
    await db.update(profiles).set({ status: 'occupied' }).where(eq(profiles.id, rows[0].id));
    await db.update(profiles).set({ status: 'maintenance' }).where(eq(profiles.id, rows[1].id));
    setSessionUser(ctx.user);

    const element = await page(ctx.company.id);
    const [dto] = element.props.accounts;

    expect(dto).toMatchObject({
      id: account.id,
      service: { id: ctx.service.id, name: ctx.service.name },
      profilesSummary: { total: 4, available: 2, occupied: 1, maintenance: 1 },
      cost: 20,
    });
    const serialized = JSON.stringify(element.props);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain(account.passwordEncrypted);
  });

  it('accounts can be filtered by code, email, status and service', async () => {
    const ctx = await makeAccountContext(db);
    const otherService = await createService(db, { companyId: ctx.company.id });
    await persistAccount(db, ctx, { code: 'ACC000010', email: 'uno@netflix.test', status: 'active' });
    await persistAccount(db, ctx, { code: 'ACC000020', email: 'dos@netflix.test', status: 'down' });
    await persistAccount(db, { ...ctx, service: otherService }, { code: 'ACC000030', email: 'tres@disney.test' });

    const emails = async (query: Record<string, string>) => (await search(ctx.company.id, query)).data.map((r) => r.account.email);

    expect(await emails({ code: '010' })).toEqual(['uno@netflix.test']);
    expect((await emails({ email: 'NETFLIX' })).sort()).toEqual(['dos@netflix.test', 'uno@netflix.test']);
    expect(await emails({ status: 'down' })).toEqual(['dos@netflix.test']);
    expect(await emails({ serviceId: otherService.id })).toEqual(['tres@disney.test']);
    expect((await search(ctx.company.id, { serviceId: 'nope', status: 'todos' })).total).toBe(3);
  });

  it('a user without list permission is redirected', async () => {
    const ctx = await makeAccountContext(db);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.show']);
    setSessionUser(ctx.user);

    await expectRedirect(page(ctx.company.id), `/${ctx.company.id}/dashboard?error=forbidden`);
  });
});
