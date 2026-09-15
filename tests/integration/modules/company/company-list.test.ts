import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { createCompanyContainer } from '@/modules/company/container';
import { SearchCompanyCommand } from '@/modules/company/commands/search-company.command';
import { searchCompanySchema } from '@/modules/company/validation/search-company.schema';
import CompaniesPage from '@/app/[companyId]/companies/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';

function search(query: Record<string, string> = {}) {
  return createCompanyContainer(db).searchService.execute(
    SearchCompanyCommand.fromInput(searchCompanySchema.parse(query)),
  );
}

describe('Listar empresas', () => {
  beforeEach(resetDb);

  it('the index lists every company of the system, not only the owner memberships', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true });
    await createCompany(db, { name: 'Ajena' });
    setSessionUser(user);

    const element = await CompaniesPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({}),
    });

    expect(element.props.companies).toHaveLength(2);
    expect(element.props.meta).toMatchObject({ total: 2, limit: 10, offset: 0, hasMore: false });
    expect(element.props.companies[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), createdAt: expect.any(String) }),
    );
  });

  it('companies can be filtered by name', async () => {
    await createCompany(db, { name: 'Streaming Norte' });
    await createCompany(db, { name: 'Cuentas Sur' });

    const { data } = await search({ name: 'norte' });

    expect(data.map((c) => c.name)).toEqual(['Streaming Norte']);
  });

  it('companies can be filtered by status and unknown statuses are ignored', async () => {
    await createCompany(db, { name: 'Activa', status: 'active' });
    await createCompany(db, { name: 'Inactiva', status: 'inactive' });

    expect((await search({ status: 'inactive' })).data.map((c) => c.name)).toEqual(['Inactiva']);
    expect((await search({ status: 'todos' })).total).toBe(2);
  });

  it('like wildcards in the name filter are matched literally', async () => {
    await createCompany(db, { name: 'Cien % Streaming' });
    await createCompany(db, { name: 'Otra' });

    expect((await search({ name: '%' })).data.map((c) => c.name)).toEqual(['Cien % Streaming']);
  });

  it('the index paginates', async () => {
    for (const name of ['A', 'B', 'C']) await createCompany(db, { name });

    const { data, total } = await search({ limit: '2', offset: '0' });

    expect(total).toBe(3);
    expect(data).toHaveLength(2);
  });
});
