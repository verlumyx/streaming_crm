import { describe, expect, it } from 'vitest';
import { ServiceFindService } from '@/modules/service/services/service-find.service';
import { ServiceListActiveService } from '@/modules/service/services/service-list-active.service';
import { ServiceSearchService } from '@/modules/service/services/service-search.service';
import { SearchServiceCommand } from '@/modules/service/commands/search-service.command';
import { ServiceNotFoundException } from '@/modules/service/exceptions/service-not-found.exception';
import { SERVICE_MODULE } from '@/modules/service/permissions';
import { createServiceContainer } from '@/modules/service/container';
import { serviceRoutes } from '@/modules/service/routes';
import { FakeServiceRepository } from './fake-service.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';
const ID_1 = '0192f3a0-0000-7000-8000-000000000001';
const ID_2 = '0192f3a0-0000-7000-8000-000000000002';

describe('Servicios: módulo de solo lectura', () => {
  it('only declares the list and show permissions', () => {
    expect(SERVICE_MODULE.permissions.map((p) => p.id)).toEqual(['services.list', 'services.show']);
  });

  it('exposes no create / update / update-status service nor route', () => {
    const container = createServiceContainer({} as never);

    expect(Object.keys(container).sort()).toEqual(['findService', 'listActiveService', 'repository', 'searchService']);
    expect(Object.keys(serviceRoutes).sort()).toEqual(['index', 'show']);
  });
});

describe('ServiceFindService / ServiceSearchService / ServiceListActiveService', () => {
  it('finds a service of the company and throws for a missing one', async () => {
    const repository = new FakeServiceRepository();
    repository.add({ id: ID_1, companyId: COMPANY, name: 'Netflix' });
    const service = new ServiceFindService(repository);

    await expect(service.execute(ID_1, COMPANY)).resolves.toMatchObject({ id: ID_1 });
    await expect(service.execute(ID_2, COMPANY)).rejects.toBeInstanceOf(ServiceNotFoundException);
    await expect(service.execute(ID_1, OTHER_COMPANY)).rejects.toBeInstanceOf(ServiceNotFoundException);
  });

  it('delegates the search to the repository', async () => {
    const repository = new FakeServiceRepository();
    repository.add({ id: ID_1, companyId: COMPANY, name: 'Netflix' });
    repository.add({ id: ID_2, companyId: OTHER_COMPANY, name: 'Disney+' });

    const result = await new ServiceSearchService(repository).execute(
      new SearchServiceCommand({ filters: { name: 'net' }, limit: 10, companyId: COMPANY }),
    );

    expect(result.total).toBe(1);
    expect(result.data.map((s) => s.name)).toEqual(['Netflix']);
  });

  it('lists only the active services of the company', async () => {
    const repository = new FakeServiceRepository();
    repository.add({ id: ID_1, companyId: COMPANY, name: 'Netflix', active: false });
    repository.add({ id: ID_2, companyId: COMPANY, name: 'Disney+' });

    const rows = await new ServiceListActiveService(repository).execute(COMPANY);

    expect(rows.map((s) => s.name)).toEqual(['Disney+']);
  });
});
