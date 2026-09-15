import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { accountRenewals, accounts, profiles } from '@/modules/account/models/account.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { DrizzleTransactionRepository } from '@/modules/transaction/repositories/drizzle-transaction.repository';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { decrypt } from '@/modules/shared/crypto';
import { uuidv7 } from '@/modules/shared/uuid';
import { createAccountAction } from '@/app/[companyId]/accounts/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createAccountWithProfiles, createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';
import { createPayload, makeAccountContext } from './account-context';

function create(companyId: string, values: Record<string, string | number | undefined>) {
  return createAccountAction(companyId, initialActionState, formData(values));
}

describe('Crear cuenta', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it('an account can be created and auto-generates one profile per service slot with the pre-loaded PINs', async () => {
    const ctx = await makeAccountContext(db, 4);
    setSessionUser(ctx.user);
    const id = uuidv7();

    await expectRedirect(
      create(
        ctx.company.id,
        createPayload(ctx.service.id, {
          id,
          notes: 'Cuenta familiar',
          profiles: [
            { number: 1, pin: '1234' },
            { number: 3, pin: '9999' },
          ],
        }),
      ),
      `/${ctx.company.id}/accounts/${id}`,
    );

    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    expect(account).toMatchObject({
      companyId: ctx.company.id,
      serviceId: ctx.service.id,
      code: 'ACC000001',
      email: 'netflix.account@test.com',
      cost: '12.50',
      purchaseDate: '2026-09-01',
      nextRenewal: '2026-10-01',
      status: 'active',
      notes: 'Cuenta familiar',
    });

    const rows = await db.select().from(profiles).where(eq(profiles.accountId, id)).orderBy(asc(profiles.number));
    expect(rows.map((p) => [p.number, p.pin, p.status])).toEqual([
      [1, '1234', 'available'],
      [2, null, 'available'],
      [3, '9999', 'available'],
      [4, null, 'available'],
    ]);
  });

  it('the password is stored encrypted, never in plain text', async () => {
    const ctx = await makeAccountContext(db);
    setSessionUser(ctx.user);
    const id = uuidv7();

    await expectRedirect(
      create(ctx.company.id, createPayload(ctx.service.id, { id, password: 'plain-text-pass' })),
      `/${ctx.company.id}/accounts/${id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
    expect(row.passwordEncrypted).not.toContain('plain-text-pass');
    expect(decrypt(row.passwordEncrypted)).toBe('plain-text-pass');
  });

  it('creating an account records the purchase movement and the ledger expense', async () => {
    const ctx = await makeAccountContext(db, 3);
    setSessionUser(ctx.user);
    const id = uuidv7();

    await expectRedirect(
      create(ctx.company.id, createPayload(ctx.service.id, { id, cost: '15', purchaseDate: '2026-06-01', nextRenewal: '2026-07-01' })),
      `/${ctx.company.id}/accounts/${id}`,
    );

    const renewals = await db.select().from(accountRenewals).where(eq(accountRenewals.accountId, id));
    expect(renewals).toHaveLength(1);
    expect(renewals[0]).toMatchObject({
      companyId: ctx.company.id,
      type: 'purchase',
      amount: '15.00',
      periodStart: '2026-06-01',
      periodEnd: '2026-07-01',
      paidAt: '2026-06-01',
      createdBy: ctx.user.id,
    });

    const ledger = await db.select().from(transactions).where(eq(transactions.relatedId, id));
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      companyId: ctx.company.id,
      type: 'expense',
      category: 'streaming_account',
      amount: '15.00',
      date: '2026-06-01',
      paymentMethod: 'cash',
      periodFrom: '2026-06-01',
      periodTo: '2026-07-01',
      relatedType: 'Account',
      recordedBy: ctx.user.id,
      description: 'Compra de cuenta ACC000001',
    });
  });

  it('nothing persists when a later step of the creation fails', async () => {
    const ctx = await makeAccountContext(db, 3);
    setSessionUser(ctx.user);
    vi.spyOn(DrizzleTransactionRepository.prototype, 'create').mockRejectedValueOnce(new Error('ledger down'));

    await expect(create(ctx.company.id, createPayload(ctx.service.id))).rejects.toThrow('ledger down');

    expect(await db.select().from(accounts)).toHaveLength(0);
    expect(await db.select().from(profiles)).toHaveLength(0);
    expect(await db.select().from(accountRenewals)).toHaveLength(0);
    expect(await db.select().from(transactions)).toHaveLength(0);
  });

  it('the code auto-increments per company', async () => {
    const ctx = await makeAccountContext(db);
    const other = await createCompany(db);
    const foreignService = await createService(db, { companyId: other.id });
    await createAccountWithProfiles(db, { companyId: other.id, serviceId: foreignService.id, code: 'ACC000007' }, 1);
    setSessionUser(ctx.user);

    await expectRedirect(create(ctx.company.id, createPayload(ctx.service.id, { email: 'a@test.com' })), `/${ctx.company.id}/accounts/`);
    await expectRedirect(create(ctx.company.id, createPayload(ctx.service.id, { email: 'b@test.com' })), `/${ctx.company.id}/accounts/`);

    const rows = await db.select().from(accounts).where(eq(accounts.companyId, ctx.company.id)).orderBy(asc(accounts.code));
    expect(rows.map((r) => r.code)).toEqual(['ACC000001', 'ACC000002']);
  });

  it('the status defaults to active and accepts a valid explicit status', async () => {
    const ctx = await makeAccountContext(db);
    setSessionUser(ctx.user);
    const id = uuidv7();

    await expectRedirect(
      create(ctx.company.id, createPayload(ctx.service.id, { id, status: 'maintenance' })),
      `/${ctx.company.id}/accounts/${id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
    expect(row.status).toBe('maintenance');
  });

  it('the same email cannot repeat within the same service (case-insensitive)', async () => {
    const ctx = await makeAccountContext(db);
    await createAccountWithProfiles(db, { companyId: ctx.company.id, serviceId: ctx.service.id, email: 'dupe@test.com' }, 1);
    setSessionUser(ctx.user);

    const result = await create(ctx.company.id, createPayload(ctx.service.id, { email: 'DUPE@test.com' }));

    expect(result.fieldErrors?.email?.[0]).toBe('Ya existe una cuenta con este email en el servicio.');
    expect(await db.select().from(accounts)).toHaveLength(1);
  });

  it('the same email can exist on a different service', async () => {
    const ctx = await makeAccountContext(db);
    const otherService = await createService(db, { companyId: ctx.company.id, maxProfiles: 3 });
    await createAccountWithProfiles(db, { companyId: ctx.company.id, serviceId: otherService.id, email: 'shared@test.com' }, 1);
    setSessionUser(ctx.user);

    await expectRedirect(
      create(ctx.company.id, createPayload(ctx.service.id, { email: 'shared@test.com' })),
      `/${ctx.company.id}/accounts/`,
    );
  });

  it('the service must belong to the company', async () => {
    const ctx = await makeAccountContext(db);
    const foreign = await createService(db, { companyId: (await createCompany(db)).id });
    setSessionUser(ctx.user);

    const result = await create(ctx.company.id, createPayload(foreign.id));

    expect(result.fieldErrors?.serviceId?.[0]).toBe('El servicio seleccionado no es válido.');
    expect(await db.select().from(accounts)).toHaveLength(0);
  });

  it('the required fields are validated', async () => {
    const ctx = await makeAccountContext(db);
    setSessionUser(ctx.user);

    const result = await create(
      ctx.company.id,
      createPayload(ctx.service.id, { email: 'no-es-email', password: '', cost: '-1', purchaseDate: 'ayer' }),
    );

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.email?.[0]).toBe('El email no es válido.');
    expect(result.fieldErrors?.password?.[0]).toBe('La contraseña es obligatoria.');
    expect(result.fieldErrors?.cost?.[0]).toBe('El costo no puede ser negativo.');
    expect(result.fieldErrors?.purchaseDate?.[0]).toBe('La fecha de compra no es válida.');
  });

  it('the next renewal must not be before the purchase date', async () => {
    const ctx = await makeAccountContext(db);
    setSessionUser(ctx.user);

    const result = await create(
      ctx.company.id,
      createPayload(ctx.service.id, { purchaseDate: '2026-06-10', nextRenewal: '2026-06-01' }),
    );

    expect(result.fieldErrors?.nextRenewal?.[0]).toBe('La próxima renovación no puede ser anterior a la fecha de compra.');
  });

  it('a profile number outside the service range is rejected', async () => {
    const ctx = await makeAccountContext(db, 2);
    setSessionUser(ctx.user);

    const result = await create(ctx.company.id, createPayload(ctx.service.id, { profiles: [{ number: 3, pin: '1234' }] }));

    expect(result.fieldErrors?.['profiles.0.number']?.[0]).toBe('El número de perfil debe estar entre 1 y 2.');
    expect(await db.select().from(accounts)).toHaveLength(0);
  });

  it('duplicated profile numbers and long PINs are rejected per row', async () => {
    const ctx = await makeAccountContext(db, 4);
    setSessionUser(ctx.user);

    const result = await create(
      ctx.company.id,
      createPayload(ctx.service.id, {
        profiles: [
          { number: 1, pin: '1' },
          { number: 1, pin: '2' },
          { number: 2, pin: '12345678901' },
        ],
      }),
    );

    expect(result.fieldErrors?.['profiles.1.number']?.[0]).toBe('El número de perfil 1 está duplicado.');
    expect(result.fieldErrors?.['profiles.2.pin']?.[0]).toBe('El PIN no puede superar 10 caracteres.');
  });

  it('a user without permission cannot create an account', async () => {
    const ctx = await makeAccountContext(db);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.list']);
    setSessionUser(ctx.user);

    const result = await create(ctx.company.id, createPayload(ctx.service.id));

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(accounts)).toHaveLength(0);
  });
});
