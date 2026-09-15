import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { createClientContainer } from '@/modules/client/container';
import { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import { searchClientSchema } from '@/modules/client/validation/search-client.schema';
import ClientsPage from '@/app/[companyId]/clients/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany, assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { createCompany } from '../../../factories/company.factory';
import { createClient } from '../../../factories/client.factory';

function search(companyId: string, query: Record<string, string> = {}) {
  const command = SearchClientCommand.fromInput(searchClientSchema.parse(query), companyId);
  return createClientContainer(db).searchService.execute(command);
}

describe('Listar clientes', () => {
  beforeEach(resetDb);

  it('the clients index renders with clients', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Ana' });
    await createClient(db, { companyId: company.id, name: 'Beto' });
    setSessionUser(user);

    const element = await ClientsPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({}),
    });

    expect(element.props.clients).toHaveLength(2);
    expect(element.props.meta).toMatchObject({ total: 2, limit: 20, offset: 0, hasMore: false });
  });

  it('the clients index includes each client active platforms', async () => {
    const ctx = await makeSaleContext(db);
    await persistSale(db, ctx, { status: 'active' });

    const { data, platforms } = await search(ctx.company.id);

    expect(data).toHaveLength(1);
    expect(platforms[ctx.client.id]).toEqual([{ id: ctx.service.id, name: ctx.service.name, code: ctx.service.code }]);
  });

  it('the clients index does not list platforms for non-active sales', async () => {
    const ctx = await makeSaleContext(db);
    await persistSale(db, ctx, { status: 'expired', profileIndex: 0 });
    await persistSale(db, ctx, { status: 'cancelled', profileIndex: 1 });

    const { platforms } = await search(ctx.company.id);

    expect(platforms[ctx.client.id]).toBeUndefined();
  });

  it('clients can be filtered by name, email, phone and code', async () => {
    const { company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Camila Rojas', email: 'camila@a.com', phone: '+58 111', code: 'CLI000010' });
    await createClient(db, { companyId: company.id, name: 'Pedro Pérez', email: 'pedro@b.com', phone: '+57 222', code: 'CLI000020' });

    expect((await search(company.id, { name: 'cami' })).data.map((c) => c.name)).toEqual(['Camila Rojas']);
    expect((await search(company.id, { email: 'b.com' })).data.map((c) => c.name)).toEqual(['Pedro Pérez']);
    expect((await search(company.id, { phone: '222' })).data.map((c) => c.name)).toEqual(['Pedro Pérez']);
    expect((await search(company.id, { code: '010' })).data.map((c) => c.name)).toEqual(['Camila Rojas']);
  });

  it('client field filters combine with AND', async () => {
    const { company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Camila Rojas', email: 'camila@a.com' });
    await createClient(db, { companyId: company.id, name: 'Camila Díaz', email: 'camila@b.com' });

    const { data } = await search(company.id, { name: 'camila', email: 'b.com' });

    expect(data.map((c) => c.name)).toEqual(['Camila Díaz']);
  });

  it('clients can be filtered by status and unknown statuses are ignored', async () => {
    const { company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Activo', status: 'active' });
    await createClient(db, { companyId: company.id, name: 'Inactivo', status: 'inactive' });

    expect((await search(company.id, { status: 'inactive' })).data.map((c) => c.name)).toEqual(['Inactivo']);
    expect((await search(company.id, { status: 'todos' })).total).toBe(2);
  });

  it('like wildcards in filters are matched literally', async () => {
    const { company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, name: 'Cien % real' });
    await createClient(db, { companyId: company.id, name: 'Otro' });

    expect((await search(company.id, { name: '%' })).data.map((c) => c.name)).toEqual(['Cien % real']);
  });

  it('the index only shows clients from the active company', async () => {
    const { company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    await createClient(db, { companyId: company.id, name: 'Mío' });
    await createClient(db, { companyId: other.id, name: 'Ajeno' });

    const { data, total } = await search(company.id);

    expect(total).toBe(1);
    expect(data.map((c) => c.name)).toEqual(['Mío']);
  });

  it('a user without permission cannot list clients', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.create']);
    setSessionUser(user);

    await expectRedirect(
      ClientsPage({ params: Promise.resolve({ companyId: company.id }), searchParams: Promise.resolve({}) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
  });
});
