import { describe, expect, it } from 'vitest';
import { ClientCreateService } from '@/modules/client/services/client-create.service';
import { ClientFindService } from '@/modules/client/services/client-find.service';
import { ClientUpdateService } from '@/modules/client/services/client-update.service';
import { ClientUpdateStatusService } from '@/modules/client/services/client-update-status.service';
import { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import { UpdateClientCommand } from '@/modules/client/commands/update-client.command';
import { UpdateStatusClientCommand } from '@/modules/client/commands/update-status-client.command';
import { ClientEmailAlreadyExistsException } from '@/modules/client/exceptions/client-email-already-exists.exception';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { FakeClientRepository } from './fake-client.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';

const newClient = (id: string, email: string | null = null, companyId = COMPANY) =>
  new CreateClientCommand(id, companyId, null, `Cliente ${id.slice(-2)}`, null, email, null);

describe('ClientCreateService', () => {
  it('creates an active client', async () => {
    const repository = new FakeClientRepository();
    const client = await new ClientCreateService(repository).execute(newClient('0192f3a0-0000-7000-8000-000000000001'));

    expect(client).toMatchObject({ status: 'active', code: 'CLI000001', companyId: COMPANY });
  });

  it('rejects an email already used in the same company (case-insensitive)', async () => {
    const repository = new FakeClientRepository();
    const service = new ClientCreateService(repository);
    await service.execute(newClient('0192f3a0-0000-7000-8000-000000000001', 'a@x.com'));

    await expect(service.execute(newClient('0192f3a0-0000-7000-8000-000000000002', 'A@X.com'))).rejects.toBeInstanceOf(
      ClientEmailAlreadyExistsException,
    );
  });

  it('allows the same email in another company', async () => {
    const repository = new FakeClientRepository();
    const service = new ClientCreateService(repository);
    await service.execute(newClient('0192f3a0-0000-7000-8000-000000000001', 'a@x.com'));

    await expect(
      service.execute(newClient('0192f3a0-0000-7000-8000-000000000002', 'a@x.com', OTHER_COMPANY)),
    ).resolves.toMatchObject({ companyId: OTHER_COMPANY });
  });
});

describe('ClientUpdateService / ClientUpdateStatusService / ClientFindService', () => {
  it('updates contact data and keeps its own email', async () => {
    const repository = new FakeClientRepository();
    await repository.create(newClient('0192f3a0-0000-7000-8000-000000000001', 'mio@x.com'));

    const updated = await new ClientUpdateService(repository).execute(
      '0192f3a0-0000-7000-8000-000000000001',
      COMPANY,
      new UpdateClientCommand('Renombrado', '+58 1', 'mio@x.com', null),
    );

    expect(updated).toMatchObject({ name: 'Renombrado', email: 'mio@x.com' });
  });

  it('throws when the client belongs to another company', async () => {
    const repository = new FakeClientRepository();
    await repository.create(newClient('0192f3a0-0000-7000-8000-000000000001'));

    await expect(
      new ClientFindService(repository).execute('0192f3a0-0000-7000-8000-000000000001', OTHER_COMPANY),
    ).rejects.toBeInstanceOf(ClientNotFoundException);
    await expect(
      new ClientUpdateStatusService(repository).execute(
        '0192f3a0-0000-7000-8000-000000000001',
        OTHER_COMPANY,
        new UpdateStatusClientCommand('inactive'),
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundException);
  });
});
