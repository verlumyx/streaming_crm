import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import ClientShowPage from '@/app/[companyId]/clients/[id]/page';
import ClientEditPage from '@/app/[companyId]/clients/[id]/edit/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectNotFound, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { createSaleRenewal } from '../../../factories/sale.factory';
import { createClient } from '../../../factories/client.factory';
import { createCompany } from '../../../factories/company.factory';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver cliente', () => {
  beforeEach(resetDb);

  it('the client show page renders', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id, name: 'Camila' });
    setSessionUser(user);

    const element = await ClientShowPage(params(company.id, client.id));

    expect(element.props.client).toMatchObject({ id: client.id, name: 'Camila', code: client.code });
    expect(element.props).toMatchObject({ canUpdate: true, canUpdateStatus: true, canCreateSale: true });
  });

  it('the client show page includes the client real sales with their profiles', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await persistSale(db, ctx, { status: 'active', profileIndex: 2 });
    setSessionUser(ctx.user);

    const element = await ClientShowPage(params(ctx.company.id, ctx.client.id));

    expect(element.props.sales).toEqual([
      expect.objectContaining({
        id: sale.id,
        status: 'active',
        serviceName: ctx.service.name,
        profileNumbers: [3],
        accountEmail: ctx.account.email,
        price: 10,
      }),
    ]);
  });

  it('the client show page exposes real metrics computed from the client sales', async () => {
    const ctx = await makeSaleContext(db);
    const active = await persistSale(db, ctx, { status: 'active', price: '15.00', profileIndex: 0 });
    await persistSale(db, ctx, { status: 'expired', price: '8.00', profileIndex: 1 });
    await persistSale(db, ctx, { status: 'cancelled', price: '5.00', profileIndex: 2 });
    await createSaleRenewal(db, active, { price: '12.00' });
    setSessionUser(ctx.user);

    const element = await ClientShowPage(params(ctx.company.id, ctx.client.id));

    expect(element.props.metrics).toEqual({ monthlyIncome: 15, pendingDebt: 8, totalPaid: 15 + 8 + 5 + 12 });
  });

  it('the client show page excludes cancelled sales and lists active before expired', async () => {
    const ctx = await makeSaleContext(db);
    await persistSale(db, ctx, { status: 'expired', profileIndex: 0 });
    await persistSale(db, ctx, { status: 'cancelled', profileIndex: 1 });
    await persistSale(db, ctx, { status: 'active', profileIndex: 2 });
    setSessionUser(ctx.user);

    const element = await ClientShowPage(params(ctx.company.id, ctx.client.id));

    expect(element.props.sales.map((s: { status: string }) => s.status)).toEqual(['active', 'expired']);
  });

  it('the client edit page renders', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id });
    setSessionUser(user);

    const element = await ClientEditPage(params(company.id, client.id));

    expect(element.props.children.props.client).toMatchObject({ id: client.id });
  });

  it('showing a missing client is a 404', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectNotFound(ClientShowPage(params(company.id, uuidv7())));
    await expectNotFound(ClientShowPage(params(company.id, 'not-a-uuid')));
  });

  it('a client from another company is a 404', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createClient(db, { companyId: (await createCompany(db)).id });
    setSessionUser(user);

    await expectNotFound(ClientShowPage(params(company.id, foreign.id)));
  });

  it('a user without permission cannot see a client', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id });
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.list']);
    setSessionUser(user);

    await expectRedirect(ClientShowPage(params(company.id, client.id)), `/${company.id}/dashboard?error=forbidden`);
    await expectRedirect(ClientEditPage(params(company.id, client.id)), `/${company.id}/dashboard?error=forbidden`);
  });
});
