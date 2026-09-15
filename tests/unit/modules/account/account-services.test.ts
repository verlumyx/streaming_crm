import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountCreateService } from '@/modules/account/services/account-create.service';
import { AccountUpdateService } from '@/modules/account/services/account-update.service';
import { AccountRenewService } from '@/modules/account/services/account-renew.service';
import { AccountFindService } from '@/modules/account/services/account-find.service';
import { AccountSearchService } from '@/modules/account/services/account-search.service';
import { AccountCredentialsService } from '@/modules/account/services/account-credentials.service';
import { CreateAccountCommand, type CreateAccountProfileLine } from '@/modules/account/commands/create-account.command';
import { UpdateAccountCommand, type UpdateAccountProfileLine } from '@/modules/account/commands/update-account.command';
import { RenewAccountCommand } from '@/modules/account/commands/renew-account.command';
import { SearchAccountCommand } from '@/modules/account/commands/search-account.command';
import { AccountNotFoundException } from '@/modules/account/exceptions/account-not-found.exception';
import { AccountEmailAlreadyExistsException } from '@/modules/account/exceptions/account-email-already-exists.exception';
import { AccountServiceInvalidException } from '@/modules/account/exceptions/account-service-invalid.exception';
import { AccountProfileNumberOutOfRangeException } from '@/modules/account/exceptions/account-profile-number-out-of-range.exception';
import { AccountProfileNotInAccountException } from '@/modules/account/exceptions/account-profile-not-in-account.exception';
import { AccountProfileTransitionNotAllowedException } from '@/modules/account/exceptions/account-profile-transition-not-allowed.exception';
import { AccountRenewalDateNotAfterException } from '@/modules/account/exceptions/account-renewal-date-not-after.exception';
import type { ProfileStatus } from '@/modules/account/models/account.model';
import { uuidv7 } from '@/modules/shared/uuid';
import { FakeAccountRepository, FakeLedger, FakeServiceLookup, fakeCipher } from './fake-account.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';
const USER = '0192f3a0-0000-7000-8000-00000000u001';

function world() {
  const repository = new FakeAccountRepository();
  const services = new FakeServiceLookup();
  const ledger = new FakeLedger();
  const createService = new AccountCreateService(repository, services, ledger, fakeCipher);
  return { repository, services, ledger, createService };
}

const newAccount = (
  serviceId: string,
  overrides: Partial<{ id: string; email: string; companyId: string; profiles: CreateAccountProfileLine[] }> = {},
) =>
  new CreateAccountCommand(
    overrides.id ?? uuidv7(),
    overrides.companyId ?? COMPANY,
    USER,
    serviceId,
    overrides.email ?? 'cuenta@test.com',
    'secret',
    12.5,
    '2026-06-13',
    '2026-07-13',
    'active',
    null,
    overrides.profiles ?? [],
  );

const updateCommand = (overrides: Partial<{ email: string; password: string | null; profiles: UpdateAccountProfileLine[] }> = {}) =>
  new UpdateAccountCommand(
    overrides.email ?? 'new@test.com',
    overrides.password === undefined ? null : overrides.password,
    10,
    '2026-06-13',
    '2026-07-13',
    'active',
    null,
    overrides.profiles ?? [],
  );

describe('AccountCreateService', () => {
  it('creates the account with an encrypted password and one profile per service slot with PINs by number', async () => {
    const { repository, services, createService } = world();
    const service = services.add(COMPANY, 4);

    const account = await createService.execute(
      newAccount(service.id, { profiles: [{ number: 2, pin: '2222' }, { number: 4, pin: '4444' }] }),
    );

    expect(account).toMatchObject({ code: 'ACC000001', passwordEncrypted: 'enc(secret)', cost: '12.50' });
    expect(repository.profiles.map((p) => [p.number, p.pin, p.status])).toEqual([
      [1, null, 'available'],
      [2, '2222', 'available'],
      [3, null, 'available'],
      [4, '4444', 'available'],
    ]);
  });

  it('records the purchase renewal and the streaming_account expense', async () => {
    const { repository, services, ledger, createService } = world();
    const service = services.add(COMPANY, 1);

    const account = await createService.execute(newAccount(service.id));

    expect(repository.renewals).toEqual([
      expect.objectContaining({
        type: 'purchase',
        amount: '12.50',
        periodStart: '2026-06-13',
        periodEnd: '2026-07-13',
        paidAt: '2026-06-13',
        createdBy: USER,
      }),
    ]);
    expect(ledger.commands).toHaveLength(1);
    expect(ledger.commands[0]).toMatchObject({
      companyId: COMPANY,
      category: 'streaming_account',
      amount: 12.5,
      date: '2026-06-13',
      description: 'Compra de cuenta ACC000001',
      options: {
        relatedType: 'Account',
        relatedId: account.id,
        periodFrom: '2026-06-13',
        periodTo: '2026-07-13',
        recordedBy: USER,
      },
    });
  });

  it('rejects a service of another company', async () => {
    const { repository, services, createService } = world();
    const foreign = services.add(OTHER_COMPANY, 3);

    await expect(createService.execute(newAccount(foreign.id))).rejects.toBeInstanceOf(AccountServiceInvalidException);
    expect(repository.accounts).toHaveLength(0);
  });

  it('rejects an email already used in the same service (case-insensitive) but allows it in another service', async () => {
    const { services, createService } = world();
    const netflix = services.add(COMPANY, 2);
    const disney = services.add(COMPANY, 2);
    await createService.execute(newAccount(netflix.id, { email: 'a@x.com' }));

    await expect(createService.execute(newAccount(netflix.id, { email: 'A@X.com' }))).rejects.toBeInstanceOf(
      AccountEmailAlreadyExistsException,
    );
    await expect(createService.execute(newAccount(disney.id, { email: 'a@x.com' }))).resolves.toMatchObject({
      serviceId: disney.id,
    });
  });

  it('rejects a profile number above the service slots, on the row field', async () => {
    const { repository, ledger, services, createService } = world();
    const service = services.add(COMPANY, 2);

    const error = await createService
      .execute(newAccount(service.id, { profiles: [{ number: 1, pin: null }, { number: 3, pin: '1' }] }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountProfileNumberOutOfRangeException);
    expect(error).toMatchObject({ field: 'profiles.1.number', message: 'El número de perfil debe estar entre 1 y 2.' });
    expect(repository.accounts).toHaveLength(0);
    expect(ledger.commands).toHaveLength(0);
  });
});

describe('AccountUpdateService', () => {
  async function seeded(statuses: ProfileStatus[] = ['available', 'available']) {
    const w = world();
    const service = w.services.add(COMPANY, statuses.length);
    const account = await w.createService.execute(newAccount(service.id, { email: 'mine@test.com' }));
    statuses.forEach((status, i) => (w.repository.profiles[i].status = status));
    return { ...w, service, account, updateService: new AccountUpdateService(w.repository, fakeCipher) };
  }

  it('updates the header and the profile lines', async () => {
    const { repository, account, updateService } = await seeded();

    const updated = await updateService.execute(
      account.id,
      COMPANY,
      updateCommand({ profiles: [{ number: 1, pin: '1234', status: 'occupied', notes: 'Cliente X' }] }),
    );

    expect(updated).toMatchObject({ email: 'new@test.com', cost: '10.00' });
    expect(repository.profiles[0]).toMatchObject({ pin: '1234', status: 'occupied', notes: 'Cliente X' });
    expect(repository.profiles[1]).toMatchObject({ pin: null, status: 'available' });
  });

  it('keeps the password when blank and encrypts a new one', async () => {
    const { account, updateService } = await seeded();

    expect(await updateService.execute(account.id, COMPANY, updateCommand())).toMatchObject({
      passwordEncrypted: 'enc(secret)',
    });
    expect(await updateService.execute(account.id, COMPANY, updateCommand({ password: 'otra' }))).toMatchObject({
      passwordEncrypted: 'enc(otra)',
    });
  });

  it('rejects a profile number that is not part of the account', async () => {
    const { repository, account, updateService } = await seeded();

    const error = await updateService
      .execute(account.id, COMPANY, updateCommand({ profiles: [{ number: 9, pin: '1' }] }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountProfileNotInAccountException);
    expect(error).toMatchObject({ field: 'profiles.0.number' });
    expect(repository.updateCalls).toBe(0);
  });

  it('rejects an invalid profile status transition without updating', async () => {
    const { repository, account, updateService } = await seeded();

    const error = await updateService
      .execute(
        account.id,
        COMPANY,
        updateCommand({ profiles: [{ number: 1, status: 'cancelled' as unknown as ProfileStatus }] }),
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountProfileTransitionNotAllowedException);
    expect(error).toMatchObject({ field: 'profiles' });
    expect(repository.updateCalls).toBe(0);
  });

  it('allows every manual transition between valid profile statuses', async () => {
    const { repository, account, updateService } = await seeded(['occupied', 'maintenance']);

    await updateService.execute(
      account.id,
      COMPANY,
      updateCommand({ profiles: [{ number: 1, status: 'available' }, { number: 2, status: 'occupied' }] }),
    );

    expect(repository.profiles.map((p) => p.status)).toEqual(['available', 'occupied']);
  });

  it('rejects the email of another account of the same service but keeps its own', async () => {
    const { service, createService, account, updateService } = await seeded();
    await createService.execute(newAccount(service.id, { email: 'taken@test.com' }));

    await expect(updateService.execute(account.id, COMPANY, updateCommand({ email: 'MINE@test.com' }))).resolves.toBeDefined();
    await expect(
      updateService.execute(account.id, COMPANY, updateCommand({ email: 'taken@TEST.com' })),
    ).rejects.toBeInstanceOf(AccountEmailAlreadyExistsException);
  });

  it('throws when the account belongs to another company', async () => {
    const { account, updateService } = await seeded();

    await expect(updateService.execute(account.id, OTHER_COMPANY, updateCommand())).rejects.toBeInstanceOf(
      AccountNotFoundException,
    );
  });
});

describe('AccountRenewService', () => {
  async function seeded() {
    const w = world();
    const service = w.services.add(COMPANY, 1);
    const account = await w.createService.execute(newAccount(service.id));
    w.ledger.commands = [];
    const renewService = new AccountRenewService(w.repository, w.ledger, () => '2026-09-14');
    return { ...w, account, renewService };
  }

  it('records the renewal, advances the next renewal, sets the cost and writes the ledger', async () => {
    const { repository, ledger, account, renewService } = await seeded();
    const renewalId = uuidv7();

    const renewed = await renewService.execute(
      new RenewAccountCommand(renewalId, COMPANY, account.id, USER, 15, '2026-08-13', 'Pago'),
    );

    expect(renewed).toMatchObject({ nextRenewal: '2026-08-13', cost: '15.00' });
    expect(repository.renewals.find((r) => r.id === renewalId)).toMatchObject({
      type: 'renewal',
      amount: '15.00',
      periodStart: '2026-07-13',
      periodEnd: '2026-08-13',
      paidAt: '2026-09-14',
      notes: 'Pago',
      createdBy: USER,
    });
    expect(ledger.commands).toHaveLength(1);
    expect(ledger.commands[0]).toMatchObject({
      category: 'streaming_account_renewal',
      amount: 15,
      date: '2026-09-14',
      description: 'Renovación de cuenta ACC000001',
      options: { relatedType: 'Account', relatedId: account.id, periodFrom: '2026-07-13', periodTo: '2026-08-13' },
    });
  });

  it('requires a date strictly after the current next renewal', async () => {
    const { repository, ledger, account, renewService } = await seeded();

    for (const date of ['2026-07-13', '2026-07-01']) {
      await expect(
        renewService.execute(new RenewAccountCommand(uuidv7(), COMPANY, account.id, USER, 15, date, null)),
      ).rejects.toBeInstanceOf(AccountRenewalDateNotAfterException);
    }
    expect(repository.renewals.filter((r) => r.type === 'renewal')).toHaveLength(0);
    expect(ledger.commands).toHaveLength(0);
    expect(account.cost).toBe('12.50');
  });

  it('throws when the account belongs to another company', async () => {
    const { account, renewService } = await seeded();

    await expect(
      renewService.execute(new RenewAccountCommand(uuidv7(), OTHER_COMPANY, account.id, USER, 1, '2027-01-01', null)),
    ).rejects.toBeInstanceOf(AccountNotFoundException);
  });
});

describe('AccountCredentialsService / AccountFindService / AccountSearchService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the decrypted credentials and logs the access', async () => {
    const { repository, services, createService } = world();
    const account = await createService.execute(newAccount(services.add(COMPANY, 1).id, { email: 'creds@test.com' }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const credentials = await new AccountCredentialsService(repository, fakeCipher).execute(account.id, COMPANY, USER);

    expect(credentials).toEqual({ email: 'creds@test.com', password: 'secret' });
    expect(info).toHaveBeenCalledWith({
      event: 'account.credentials.accessed',
      userId: USER,
      accountId: account.id,
      companyId: COMPANY,
      code: 'ACC000001',
    });
  });

  it('credentials and find throw when the account is not in the company', async () => {
    const { repository, services, createService } = world();
    const account = await createService.execute(newAccount(services.add(COMPANY, 1).id));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await expect(
      new AccountCredentialsService(repository, fakeCipher).execute(account.id, OTHER_COMPANY, USER),
    ).rejects.toBeInstanceOf(AccountNotFoundException);
    await expect(new AccountFindService(repository).execute(account.id, OTHER_COMPANY)).rejects.toBeInstanceOf(
      AccountNotFoundException,
    );
    expect(info).not.toHaveBeenCalled();
  });

  it('find returns the detail and search delegates to the repository scoped by company', async () => {
    const { repository, services, createService } = world();
    const service = services.add(COMPANY, 2);
    repository.services.push({ id: service.id, code: service.code, name: service.name, maxProfiles: 2 });
    const account = await createService.execute(newAccount(service.id));
    await createService.execute(newAccount(services.add(OTHER_COMPANY, 1).id, { companyId: OTHER_COMPANY }));

    const detail = await new AccountFindService(repository).execute(account.id, COMPANY);
    expect(detail.profiles).toHaveLength(2);
    expect(detail.renewals).toHaveLength(1);

    const { data, total } = await new AccountSearchService(repository).execute(new SearchAccountCommand({ companyId: COMPANY }));
    expect(total).toBe(1);
    expect(data[0].profilesSummary).toEqual({ total: 2, available: 2, occupied: 0, maintenance: 0 });
  });
});
