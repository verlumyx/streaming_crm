import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { createServiceContainer } from '@/modules/service/container';
import { SearchServiceCommand } from '@/modules/service/commands/search-service.command';
import { searchServiceSchema } from '@/modules/service/validation/search-service.schema';
import ServicesPage from '@/app/[companyId]/services/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany, assignRoleWithPermissions } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createService } from '../../../factories/catalog.factory';

function search(companyId: string, query: Record<string, string> = {}) {
  const command = SearchServiceCommand.fromInput(searchServiceSchema.parse(query), companyId);
  return createServiceContainer(db).searchService.execute(command);
}

describe('Listar servicios', () => {
  beforeEach(resetDb);

  it('the services index renders with services', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createService(db, { companyId: company.id });
    await createService(db, { companyId: company.id });
    await createService(db, { companyId: company.id });
    setSessionUser(user);

    const element = await ServicesPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({ active: '1' }),
    });

    expect(element.props.services).toHaveLength(3);
    expect(element.props.services[0]).toMatchObject({ active: true, createdAt: expect.any(String) });
    expect(element.props.meta).toMatchObject({ total: 3, limit: 10, offset: 0, hasMore: false });
    expect(element.props.filters).toEqual({ active: '1' });
  });

  it('services can be filtered by name', async () => {
    const { company } = await createUserWithCompany(db);
    await createService(db, { companyId: company.id, name: 'Netflix' });
    await createService(db, { companyId: company.id, name: 'Disney Plus' });

    expect((await search(company.id, { name: 'netf' })).data.map((s) => s.name)).toEqual(['Netflix']);
  });

  it('services can be filtered by code', async () => {
    const { company } = await createUserWithCompany(db);
    const target = await createService(db, { companyId: company.id, code: 'SER000777' });
    await createService(db, { companyId: company.id, code: 'SER000888' });

    expect((await search(company.id, { code: '000777' })).data.map((s) => s.id)).toEqual([target.id]);
  });

  it('services can be filtered by active state and unknown values are ignored', async () => {
    const { company } = await createUserWithCompany(db);
    const active = await createService(db, { companyId: company.id, active: true });
    const inactive = await createService(db, { companyId: company.id, active: false });

    expect((await search(company.id, { active: '1' })).data.map((s) => s.id)).toEqual([active.id]);
    expect((await search(company.id, { active: '0' })).data.map((s) => s.id)).toEqual([inactive.id]);
    expect((await search(company.id, { active: 'all' })).total).toBe(2);
  });

  it('like wildcards in filters are matched literally', async () => {
    const { company } = await createUserWithCompany(db);
    await createService(db, { companyId: company.id, name: 'Cien % real' });
    await createService(db, { companyId: company.id, name: 'Otro' });

    expect((await search(company.id, { name: '%' })).data.map((s) => s.name)).toEqual(['Cien % real']);
  });

  it('services are scoped to the current company', async () => {
    const { company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    await createService(db, { companyId: company.id, name: 'Mío' });
    await createService(db, { companyId: other.id, name: 'Ajeno' });

    const { data, total } = await search(company.id);

    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(['Mío']);
  });

  it('a user without permission cannot list services', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.list']);
    setSessionUser(user);

    await expectRedirect(
      ServicesPage({ params: Promise.resolve({ companyId: company.id }), searchParams: Promise.resolve({}) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
  });
});
