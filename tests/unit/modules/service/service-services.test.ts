import { describe, expect, it } from 'vitest';
import { ServiceCreateService } from '@/modules/service/services/service-create.service';
import { ServiceFindService } from '@/modules/service/services/service-find.service';
import { ServiceListActiveService } from '@/modules/service/services/service-list-active.service';
import { ServiceSearchService } from '@/modules/service/services/service-search.service';
import { ServiceUpdateService } from '@/modules/service/services/service-update.service';
import { ServiceUpdateStatusService } from '@/modules/service/services/service-update-status.service';
import { CreateServiceCommand } from '@/modules/service/commands/create-service.command';
import { SearchServiceCommand } from '@/modules/service/commands/search-service.command';
import { UpdateServiceCommand } from '@/modules/service/commands/update-service.command';
import { UpdateStatusServiceCommand } from '@/modules/service/commands/update-status-service.command';
import { ServiceNameAlreadyExistsException } from '@/modules/service/exceptions/service-name-already-exists.exception';
import { ServiceNotFoundException } from '@/modules/service/exceptions/service-not-found.exception';
import { FakeServiceRepository } from './fake-service.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';
const ID_1 = '0192f3a0-0000-7000-8000-000000000001';
const ID_2 = '0192f3a0-0000-7000-8000-000000000002';

const newService = (id: string, name: string, companyId = COMPANY) =>
  new CreateServiceCommand(id, companyId, name, 'https://logo.test/x.png', 5);

describe('ServiceCreateService', () => {
  it('creates an active service and returns the persisted row', async () => {
    const repository = new FakeServiceRepository();
    const service = await new ServiceCreateService(repository).execute(newService(ID_1, 'Netflix'));

    expect(service).toMatchObject({ id: ID_1, name: 'Netflix', active: true, code: 'SER000001', companyId: COMPANY });
    expect(repository.rows).toHaveLength(1);
  });

  it('rejects a name already used in the same company (case-insensitive)', async () => {
    const repository = new FakeServiceRepository();
    const service = new ServiceCreateService(repository);
    await service.execute(newService(ID_1, 'Netflix'));

    await expect(service.execute(newService(ID_2, 'NETFLIX'))).rejects.toBeInstanceOf(ServiceNameAlreadyExistsException);
    expect(repository.rows).toHaveLength(1);
  });

  it('allows the same name in another company', async () => {
    const repository = new FakeServiceRepository();
    const service = new ServiceCreateService(repository);
    await service.execute(newService(ID_1, 'Netflix'));

    await expect(service.execute(newService(ID_2, 'Netflix', OTHER_COMPANY))).resolves.toMatchObject({
      companyId: OTHER_COMPANY,
    });
  });
});

describe('ServiceUpdateService', () => {
  it('updates name, logo and max profiles and keeps its own name', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));

    const updated = await new ServiceUpdateService(repository).execute(
      ID_1,
      COMPANY,
      new UpdateServiceCommand('netflix', null, 6),
    );

    expect(updated).toMatchObject({ name: 'netflix', logoUrl: null, maxProfiles: 6 });
  });

  it('rejects a name taken by another service of the company', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));
    await repository.create(newService(ID_2, 'Disney+'));

    await expect(
      new ServiceUpdateService(repository).execute(ID_2, COMPANY, new UpdateServiceCommand('netflix', null, 4)),
    ).rejects.toBeInstanceOf(ServiceNameAlreadyExistsException);
  });

  it('throws when the service is missing or belongs to another company', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));
    const service = new ServiceUpdateService(repository);

    await expect(service.execute(ID_2, COMPANY, new UpdateServiceCommand('X', null, 1))).rejects.toBeInstanceOf(
      ServiceNotFoundException,
    );
    await expect(service.execute(ID_1, OTHER_COMPANY, new UpdateServiceCommand('X', null, 1))).rejects.toBeInstanceOf(
      ServiceNotFoundException,
    );
  });
});

describe('ServiceUpdateStatusService', () => {
  it('deactivates and reactivates a service', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));
    const service = new ServiceUpdateStatusService(repository);

    await expect(service.execute(ID_1, COMPANY, new UpdateStatusServiceCommand(false))).resolves.toMatchObject({
      active: false,
    });
    await expect(service.execute(ID_1, COMPANY, new UpdateStatusServiceCommand(true))).resolves.toMatchObject({
      active: true,
    });
  });

  it('throws when the service belongs to another company', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));

    await expect(
      new ServiceUpdateStatusService(repository).execute(ID_1, OTHER_COMPANY, new UpdateStatusServiceCommand(false)),
    ).rejects.toBeInstanceOf(ServiceNotFoundException);
  });
});

describe('ServiceFindService / ServiceSearchService / ServiceListActiveService', () => {
  it('finds a service of the company and throws for a missing one', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));
    const service = new ServiceFindService(repository);

    await expect(service.execute(ID_1, COMPANY)).resolves.toMatchObject({ id: ID_1 });
    await expect(service.execute(ID_2, COMPANY)).rejects.toBeInstanceOf(ServiceNotFoundException);
    await expect(service.execute(ID_1, OTHER_COMPANY)).rejects.toBeInstanceOf(ServiceNotFoundException);
  });

  it('delegates the search to the repository', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));
    await repository.create(newService(ID_2, 'Disney+', OTHER_COMPANY));

    const result = await new ServiceSearchService(repository).execute(
      new SearchServiceCommand({ filters: { name: 'net' }, limit: 10, companyId: COMPANY }),
    );

    expect(result.total).toBe(1);
    expect(result.data.map((s) => s.name)).toEqual(['Netflix']);
  });

  it('lists only the active services of the company', async () => {
    const repository = new FakeServiceRepository();
    await repository.create(newService(ID_1, 'Netflix'));
    await repository.create(newService(ID_2, 'Disney+'));
    repository.rows[0].active = false;

    const rows = await new ServiceListActiveService(repository).execute(COMPANY);

    expect(rows.map((s) => s.name)).toEqual(['Disney+']);
  });
});
