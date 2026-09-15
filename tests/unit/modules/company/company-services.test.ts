import { describe, expect, it } from 'vitest';
import { CompanyCreateService } from '@/modules/company/services/company-create.service';
import { CompanyFindService } from '@/modules/company/services/company-find.service';
import { CompanySearchService } from '@/modules/company/services/company-search.service';
import { CompanyUpdateService } from '@/modules/company/services/company-update.service';
import { CompanyUpdateStatusService } from '@/modules/company/services/company-update-status.service';
import { CreateCompanyCommand } from '@/modules/company/commands/create-company.command';
import { SearchCompanyCommand } from '@/modules/company/commands/search-company.command';
import { UpdateCompanyCommand } from '@/modules/company/commands/update-company.command';
import { UpdateStatusCompanyCommand } from '@/modules/company/commands/update-status-company.command';
import { CompanyNameAlreadyExistsException } from '@/modules/company/exceptions/company-name-already-exists.exception';
import { CompanyNotFoundException } from '@/modules/company/exceptions/company-not-found.exception';
import { FakeCompanyRepository, FakeCompanyServicesSeeder } from './fake-company.repository';

const OWNER = '0192f3a0-0000-7000-8000-0000000000aa';
const ID_1 = '0192f3a0-0000-7000-8000-000000000001';
const ID_2 = '0192f3a0-0000-7000-8000-000000000002';

const newCompany = (id: string, name: string, description: string | null = null) =>
  new CreateCompanyCommand(id, OWNER, name, description);

function createService() {
  const repository = new FakeCompanyRepository();
  const seeder = new FakeCompanyServicesSeeder(repository);
  return { repository, seeder, service: new CompanyCreateService(repository, seeder) };
}

describe('CompanyCreateService', () => {
  it('creates an active company, its Administrador role, the default membership and the services, in order', async () => {
    const { repository, seeder, service } = createService();

    const company = await service.execute(newCompany(ID_1, 'Acme', 'Desc'));

    expect(company).toMatchObject({
      id: ID_1,
      name: 'Acme',
      description: 'Desc',
      status: 'active',
      createdBy: OWNER,
    });
    expect(repository.steps).toEqual(['company', 'role', 'membership', 'services']);
    expect(repository.memberships).toEqual([
      { userId: OWNER, companyId: ID_1, roleId: 'role-1', isDefault: true },
    ]);
    expect(seeder.seeded).toEqual([ID_1]);
  });

  it('leaves the creator with a single default membership', async () => {
    const { repository, service } = createService();

    await service.execute(newCompany(ID_1, 'Uno'));
    await service.execute(newCompany(ID_2, 'Dos'));

    expect(repository.memberships.filter((m) => m.isDefault).map((m) => m.companyId)).toEqual([ID_2]);
  });

  it('rejects a name already used by another company (case-insensitive) before writing anything', async () => {
    const { repository, service } = createService();
    await service.execute(newCompany(ID_1, 'Acme'));
    repository.steps = [];

    await expect(service.execute(newCompany(ID_2, 'ACME'))).rejects.toBeInstanceOf(
      CompanyNameAlreadyExistsException,
    );
    expect(repository.steps).toEqual([]);
  });
});

describe('CompanyUpdateService / CompanyUpdateStatusService / CompanyFindService / CompanySearchService', () => {
  it('updates name and description and keeps its own name', async () => {
    const { repository, service } = createService();
    await service.execute(newCompany(ID_1, 'Acme'));

    const updated = await new CompanyUpdateService(repository).execute(
      ID_1,
      new UpdateCompanyCommand('acme', 'Nueva'),
    );

    expect(updated).toMatchObject({ name: 'acme', description: 'Nueva' });
  });

  it('cannot take the name of another company', async () => {
    const { repository, service } = createService();
    await service.execute(newCompany(ID_1, 'Acme'));
    await service.execute(newCompany(ID_2, 'Otra'));

    await expect(
      new CompanyUpdateService(repository).execute(ID_2, new UpdateCompanyCommand('Acme', null)),
    ).rejects.toBeInstanceOf(CompanyNameAlreadyExistsException);
  });

  it('changes the status', async () => {
    const { repository, service } = createService();
    await service.execute(newCompany(ID_1, 'Acme'));

    const updated = await new CompanyUpdateStatusService(repository).execute(
      ID_1,
      new UpdateStatusCompanyCommand('inactive'),
    );

    expect(updated.status).toBe('inactive');
  });

  it('throws when the company does not exist', async () => {
    const repository = new FakeCompanyRepository();

    await expect(new CompanyFindService(repository).execute(ID_1)).rejects.toBeInstanceOf(
      CompanyNotFoundException,
    );
    await expect(
      new CompanyUpdateService(repository).execute(ID_1, new UpdateCompanyCommand('X', null)),
    ).rejects.toBeInstanceOf(CompanyNotFoundException);
    await expect(
      new CompanyUpdateStatusService(repository).execute(ID_1, new UpdateStatusCompanyCommand('inactive')),
    ).rejects.toBeInstanceOf(CompanyNotFoundException);
  });

  it('searches through the repository', async () => {
    const { repository, service } = createService();
    await service.execute(newCompany(ID_1, 'Acme'));

    const result = await new CompanySearchService(repository).execute(new SearchCompanyCommand());

    expect(result.total).toBe(1);
  });
});
