import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { plans } from '@/modules/plan/models/plan.model';
import { clients } from '@/modules/client/models/client.model';
import SaleShowPage from '@/app/[companyId]/sales/[id]/page';
import SaleCreatePage from '@/app/[companyId]/sales/create/page';
import { createSaleAction, searchSaleClientsAction } from '@/app/[companyId]/sales/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectNotFound, expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { createSaleRenewal } from '../../../factories/sale.factory';
import { createClient } from '../../../factories/client.factory';
import { createPlan } from '../../../factories/catalog.factory';
import { daysFromToday, FORBIDDEN_MESSAGE, forbiddenUrl, form, saleEnding, today } from './sale-test-utils';

const showParams = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });
const createParams = (companyId: string, query: Record<string, string> = {}) => ({
  params: Promise.resolve({ companyId }),
  searchParams: Promise.resolve(query),
});

describe('Ver venta', () => {
  beforeEach(resetDb);

  it('the show page returns the sale with its profiles, ledger entries and flags', async () => {
    const ctx = await makeSaleContext(db);
    setSessionUser(ctx.user);
    const id = uuidv7();
    await expectRedirect(
      createSaleAction(
        ctx.company.id,
        initialActionState,
        form({ id, clientId: ctx.client.id, planId: ctx.plan.id, startDate: today(), profileIds: [ctx.profiles[1].id], notes: 'Nota' }),
      ),
      `/${ctx.company.id}/sales/${id}`,
    );

    const element = await SaleShowPage(showParams(ctx.company.id, id));

    expect(element.props).toMatchObject({ canRenew: true, canReactivate: true, canCancel: true, replacementProfiles: [] });
    expect(element.props.sale).toMatchObject({
      id,
      code: 'SAL000001',
      status: 'active',
      notes: 'Nota',
      canBeRenewed: true,
      canBeReactivated: false,
      isInGracePeriod: false,
      daysUntilExpiration: 30,
      requiredProfileCount: 1,
      client: { id: ctx.client.id },
      agent: { id: ctx.user.id },
      saleProfiles: [
        {
          profileId: ctx.profiles[1].id,
          number: 2,
          profileStatus: 'occupied',
          account: { id: ctx.account.id, code: ctx.account.code, email: ctx.account.email },
        },
      ],
      transactions: [{ category: 'sale', type: 'income', amount: 10 }],
    });
  });

  it('the show page exposes the current plan price and duration next to the sale snapshot and renewals newest first', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await persistSale(db, ctx, { status: 'active' });
    await createSaleRenewal(db, { ...sale, endDate: '2026-10-01' });
    await createSaleRenewal(db, { ...sale, endDate: '2026-11-01' }, { price: '12.00' });
    await db.update(plans).set({ durationDays: 60, salePrice: '75.00' }).where(eq(plans.id, ctx.plan.id));
    setSessionUser(ctx.user);

    const { props } = await SaleShowPage(showParams(ctx.company.id, sale.id));

    expect(props.sale).toMatchObject({ durationDays: 30, price: 10, plan: { durationDays: 60, salePrice: 75 } });
    expect(props.sale.renewals.map((r: { renewedAt: string }) => r.renewedAt)).toEqual(['2026-11-01', '2026-10-01']);
    expect(props.sale.renewals[0].price).toBe(12);
  });

  it('a reactivable sale offers the available profiles of its service as replacements', async () => {
    const ctx = await makeSaleContext(db, 3);
    const sale = await saleEnding(ctx, daysFromToday(-10), { status: 'expired', profileIndex: 0 });
    const inGrace = await saleEnding(ctx, daysFromToday(-1), { status: 'expired', profileIndex: 1 });
    setSessionUser(ctx.user);

    const reactivable = await SaleShowPage(showParams(ctx.company.id, sale.id));
    const grace = await SaleShowPage(showParams(ctx.company.id, inGrace.id));

    expect(reactivable.props.sale).toMatchObject({ canBeReactivated: true, canBeRenewed: false, daysUntilExpiration: -10 });
    expect(reactivable.props.replacementProfiles.map((p: { id: string }) => p.id)).toEqual([ctx.profiles[2].id]);
    expect(grace.props.sale).toMatchObject({ isInGracePeriod: true, canBeRenewed: true, canBeReactivated: false });
    expect(grace.props.replacementProfiles).toEqual([]);
  });

  it('action flags follow the user permissions', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await persistSale(db, ctx);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.show', 'sales.cancel']);
    setSessionUser(ctx.user);

    const { props } = await SaleShowPage(showParams(ctx.company.id, sale.id));

    expect(props).toMatchObject({ canRenew: false, canReactivate: false, canCancel: true });
  });

  it('showing a missing, malformed or foreign sale is a 404', async () => {
    const ctx = await makeSaleContext(db);
    const foreign = await makeSaleContext(db);
    const foreignSale = await persistSale(db, foreign);
    setSessionUser(ctx.user);

    await expectNotFound(SaleShowPage(showParams(ctx.company.id, uuidv7())));
    await expectNotFound(SaleShowPage(showParams(ctx.company.id, 'not-a-uuid')));
    await expectNotFound(SaleShowPage(showParams(ctx.company.id, foreignSale.id)));
  });

  it('a user without show permission cannot see a sale', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await persistSale(db, ctx);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.list']);
    setSessionUser(ctx.user);

    await expectRedirect(SaleShowPage(showParams(ctx.company.id, sale.id)), forbiddenUrl(ctx.company.id));
  });
});

describe('Crear venta (wizard page)', () => {
  beforeEach(resetDb);

  it('the create page exposes active clients, active plans and available profiles', async () => {
    const ctx = await makeSaleContext(db);
    await createClient(db, { companyId: ctx.company.id, status: 'inactive' });
    await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, active: false });
    await persistSale(db, ctx, { profileIndex: 0 });
    setSessionUser(ctx.user);

    const element = await SaleCreatePage(createParams(ctx.company.id));
    const props = element.props.children.props;

    expect(props.today).toBe(today());
    expect(props.initialId).toMatch(/^[0-9a-f-]{36}$/);
    expect(props.clients.map((c: { id: string }) => c.id)).toEqual([ctx.client.id]);
    expect(props.plans).toEqual([
      expect.objectContaining({
        id: ctx.plan.id,
        serviceId: ctx.service.id,
        serviceName: ctx.service.name,
        maxProfiles: 4,
        capacity: 'profile',
        durationDays: 30,
        salePrice: 10,
      }),
    ]);
    expect(props.availableProfiles.map((p: { id: string }) => p.id).sort()).toEqual(
      ctx.profiles.slice(1).map((p) => p.id).sort(),
    );
    expect(props.availableProfiles[0]).toMatchObject({ accountEmail: ctx.account.email, serviceId: ctx.service.id });
    expect(props.preselectedClientId).toBeNull();
  });

  it('the create page preselects an active client passed via ?client and pins it outside the first batch', async () => {
    const ctx = await makeSaleContext(db);
    await db.update(clients).set({ name: 'Zulema Zapata' }).where(eq(clients.id, ctx.client.id));
    for (let i = 0; i < 20; i++) await createClient(db, { companyId: ctx.company.id, name: `Ana ${String(i).padStart(2, '0')}` });
    setSessionUser(ctx.user);

    const props = (await SaleCreatePage(createParams(ctx.company.id, { client: ctx.client.id }))).props.children.props;

    expect(props.preselectedClientId).toBe(ctx.client.id);
    expect(props.clients).toHaveLength(21);
    expect(props.clients[0].id).toBe(ctx.client.id);
  });

  it('the create page ignores a client param that is not an active client of the company', async () => {
    const ctx = await makeSaleContext(db);
    const inactive = await createClient(db, { companyId: ctx.company.id, status: 'inactive' });
    const foreign = await makeSaleContext(db);
    setSessionUser(ctx.user);

    for (const client of [inactive.id, foreign.client.id, 'nope']) {
      const props = (await SaleCreatePage(createParams(ctx.company.id, { client }))).props.children.props;
      expect(props.preselectedClientId).toBeNull();
      expect(props.clients.map((c: { id: string }) => c.id)).toEqual([ctx.client.id]);
    }
  });

  it('a user without create permission cannot open the wizard', async () => {
    const ctx = await makeSaleContext(db);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.list']);
    setSessionUser(ctx.user);

    await expectRedirect(SaleCreatePage(createParams(ctx.company.id)), forbiddenUrl(ctx.company.id));
  });
});

describe('Búsqueda de clientes del wizard', () => {
  beforeEach(resetDb);

  it('returns matching active clients by name or code, case-insensitive', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Carlos Pérez', code: 'CLI000001' });
    await createClient(db, { companyId: company.id, name: 'Ana Gómez', code: 'CLI000777' });
    setSessionUser(user);

    const byName = await searchSaleClientsAction(company.id, 'CARLOS');
    const byCode = await searchSaleClientsAction(company.id, 'cli000777');

    expect(byName).toMatchObject({ status: 'idle', clients: [{ name: 'Carlos Pérez', code: 'CLI000001', status: 'active' }] });
    expect(byCode.clients.map((c) => c.name)).toEqual(['Ana Gómez']);
  });

  it('excludes inactive clients and clients of other companies', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Cliente Inactivo', status: 'inactive' });
    await createClient(db, { companyId: other.company.id, name: 'Cliente Ajeno' });
    setSessionUser(user);

    expect((await searchSaleClientsAction(company.id, 'cliente')).clients).toEqual([]);
  });

  it('an empty term returns the initial batch of active clients, limited to 20', async () => {
    const { user, company } = await createUserWithCompany(db);
    for (let i = 0; i < 25; i++) await createClient(db, { companyId: company.id, name: `Cliente ${String(i).padStart(2, '0')}` });
    setSessionUser(user);

    const all = await searchSaleClientsAction(company.id, '   ');
    const term = await searchSaleClientsAction(company.id, 'cliente');

    expect(all.clients).toHaveLength(20);
    expect(all.clients[0].name).toBe('Cliente 00');
    expect(term.clients).toHaveLength(20);
  });

  it('a user without create permission cannot search clients', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Carlos' });
    await assignRoleWithPermissions(db, user.id, company.id, ['sales.list']);
    setSessionUser(user);

    expect(await searchSaleClientsAction(company.id, 'carlos')).toEqual({
      status: 'error',
      message: FORBIDDEN_MESSAGE,
      clients: [],
    });
  });
});
