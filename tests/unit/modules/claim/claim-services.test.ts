import { beforeEach, describe, expect, it } from 'vitest';
import { uuidv7 } from '@/modules/shared/uuid';
import { CreateClaimCommand } from '@/modules/claim/commands/create-claim.command';
import { UpdateClaimCommand } from '@/modules/claim/commands/update-claim.command';
import { UpdateStatusClaimCommand } from '@/modules/claim/commands/update-status-claim.command';
import { SearchClaimCommand } from '@/modules/claim/commands/search-claim.command';
import { ClaimCreateService } from '@/modules/claim/services/claim-create.service';
import { ClaimUpdateService } from '@/modules/claim/services/claim-update.service';
import { ClaimUpdateStatusService } from '@/modules/claim/services/claim-update-status.service';
import { ClaimFindService } from '@/modules/claim/services/claim-find.service';
import { ClaimSearchService } from '@/modules/claim/services/claim-search.service';
import { ClaimFormService } from '@/modules/claim/services/claim-form.service';
import { ClaimNotFoundException } from '@/modules/claim/exceptions/claim-not-found.exception';
import { ClaimClosedException } from '@/modules/claim/exceptions/claim-closed.exception';
import { ClaimClientNotFoundException } from '@/modules/claim/exceptions/claim-client-not-found.exception';
import { FakeClaimRepository } from './fake-claim.repository';

const COMPANY = uuidv7();
const OTHER_COMPANY = uuidv7();
const CLIENT = uuidv7();
const USER = uuidv7();

let repository: FakeClaimRepository;

const createCommand = (overrides: Partial<{ id: string; clientId: string; subject: string }> = {}) =>
  new CreateClaimCommand(
    overrides.id ?? uuidv7(),
    COMPANY,
    overrides.clientId ?? CLIENT,
    overrides.subject ?? 'No carga Netflix',
    'El perfil pide contraseña.',
    'whatsapp',
    USER,
  );

const seedClaim = async () => {
  const command = createCommand();
  await new ClaimCreateService(repository).execute(command);
  return command.id;
};

beforeEach(() => {
  repository = new FakeClaimRepository();
  repository.clients = [
    { id: CLIENT, companyId: COMPANY, name: 'Ana Pérez', code: 'CLI000001', status: 'active' },
    { id: uuidv7(), companyId: OTHER_COMPANY, name: 'Otro', code: 'CLI000001', status: 'active' },
  ];
});

describe('ClaimCreateService', () => {
  it('creates an open claim with a sequential code and the reporting user', async () => {
    const command = createCommand();

    const claim = await new ClaimCreateService(repository).execute(command);

    expect(claim).toMatchObject({
      id: command.id,
      code: 'REC000001',
      status: 'open',
      subject: 'No carga Netflix',
      channel: 'whatsapp',
      reportedBy: USER,
      resolvedBy: null,
      resolvedAt: null,
      client: { id: CLIENT, name: 'Ana Pérez' },
    });
  });

  it('numbers the codes sequentially inside the company', async () => {
    const service = new ClaimCreateService(repository);

    await service.execute(createCommand());
    const second = await service.execute(createCommand());

    expect(second.code).toBe('REC000002');
  });

  it('rejects a client that does not belong to the company', async () => {
    const command = createCommand({ clientId: uuidv7() });

    await expect(new ClaimCreateService(repository).execute(command)).rejects.toThrow(ClaimClientNotFoundException);
    expect(repository.rows).toHaveLength(0);
  });
});

describe('ClaimUpdateService', () => {
  it('updates the data of an open claim and locks the row', async () => {
    const id = await seedClaim();

    const claim = await new ClaimUpdateService(repository).execute(
      id,
      COMPANY,
      new UpdateClaimCommand(CLIENT, 'Asunto corregido', 'Nueva descripción', 'phone'),
    );

    expect(claim).toMatchObject({ subject: 'Asunto corregido', description: 'Nueva descripción', channel: 'phone' });
    expect(repository.locks).toContain(id);
  });

  it('refuses to update a closed claim', async () => {
    const id = await seedClaim();
    await new ClaimUpdateStatusService(repository).execute(
      id,
      COMPANY,
      new UpdateStatusClaimCommand('closed', 'Listo', USER),
    );

    await expect(
      new ClaimUpdateService(repository).execute(id, COMPANY, new UpdateClaimCommand(CLIENT, 'X', 'Y', 'other')),
    ).rejects.toThrow(ClaimClosedException);
  });

  it('refuses a client of another company', async () => {
    const id = await seedClaim();

    await expect(
      new ClaimUpdateService(repository).execute(id, COMPANY, new UpdateClaimCommand(uuidv7(), 'X', 'Y', 'other')),
    ).rejects.toThrow(ClaimClientNotFoundException);
  });

  it('fails when the claim does not exist in the company', async () => {
    const id = await seedClaim();

    await expect(
      new ClaimUpdateService(repository).execute(id, OTHER_COMPANY, new UpdateClaimCommand(CLIENT, 'X', 'Y', 'other')),
    ).rejects.toThrow(ClaimNotFoundException);
  });
});

describe('ClaimUpdateStatusService', () => {
  it('stamps who resolved it and when', async () => {
    const id = await seedClaim();

    const claim = await new ClaimUpdateStatusService(repository).execute(
      id,
      COMPANY,
      new UpdateStatusClaimCommand('resolved', 'Se restableció la cuenta.', USER),
    );

    expect(claim).toMatchObject({ status: 'resolved', resolvedBy: USER, resolutionNotes: 'Se restableció la cuenta.' });
    expect(claim.resolvedAt).not.toBeNull();
  });

  it('clears the resolution stamp when the claim goes back to in_progress', async () => {
    const id = await seedClaim();
    const service = new ClaimUpdateStatusService(repository);
    await service.execute(id, COMPANY, new UpdateStatusClaimCommand('resolved', 'Listo', USER));

    const claim = await service.execute(id, COMPANY, new UpdateStatusClaimCommand('in_progress', undefined, USER));

    expect(claim).toMatchObject({ status: 'in_progress', resolvedBy: null, resolvedAt: null });
  });

  it('keeps the stored notes when the form does not send them', async () => {
    const id = await seedClaim();
    const service = new ClaimUpdateStatusService(repository);
    await service.execute(id, COMPANY, new UpdateStatusClaimCommand('resolved', 'Notas originales', USER));

    const claim = await service.execute(id, COMPANY, new UpdateStatusClaimCommand('in_progress', undefined, USER));

    expect(claim.resolutionNotes).toBe('Notas originales');
  });

  it('clears the notes when an empty value arrives', async () => {
    const id = await seedClaim();
    const service = new ClaimUpdateStatusService(repository);
    await service.execute(id, COMPANY, new UpdateStatusClaimCommand('resolved', 'Notas originales', USER));

    const claim = await service.execute(id, COMPANY, new UpdateStatusClaimCommand('resolved', null, USER));

    expect(claim.resolutionNotes).toBeNull();
  });

  it('refuses any change once the claim is closed', async () => {
    const id = await seedClaim();
    const service = new ClaimUpdateStatusService(repository);
    await service.execute(id, COMPANY, new UpdateStatusClaimCommand('closed', null, USER));

    await expect(service.execute(id, COMPANY, new UpdateStatusClaimCommand('open', null, USER))).rejects.toThrow(
      ClaimClosedException,
    );
  });
});

describe('ClaimFindService', () => {
  it('fails when the claim belongs to another company', async () => {
    const id = await seedClaim();

    await expect(new ClaimFindService(repository).execute(id, OTHER_COMPANY)).rejects.toThrow(ClaimNotFoundException);
  });
});

describe('ClaimSearchService', () => {
  it('only returns the claims of the company', async () => {
    await seedClaim();
    await seedClaim();

    const own = await new ClaimSearchService(repository).execute(new SearchClaimCommand({ companyId: COMPANY }));
    const other = await new ClaimSearchService(repository).execute(new SearchClaimCommand({ companyId: OTHER_COMPANY }));

    expect(own.total).toBe(2);
    expect(other.total).toBe(0);
  });
});

describe('ClaimFormService', () => {
  it('preselects the requested client of the company', async () => {
    const form = await new ClaimFormService(repository).execute(COMPANY, CLIENT);

    expect(form.preselectedClientId).toBe(CLIENT);
    expect(form.clients.map((c) => c.id)).toEqual([CLIENT]);
  });

  it('ignores an invalid id or a client of another company', async () => {
    expect((await new ClaimFormService(repository).execute(COMPANY, 'no-es-uuid')).preselectedClientId).toBeNull();
    expect((await new ClaimFormService(repository).execute(COMPANY, uuidv7())).preselectedClientId).toBeNull();
  });
});
