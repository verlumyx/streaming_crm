import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, profiles } from '@/modules/account/models/account.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { decrypt } from '@/modules/shared/crypto';
import { uuidv7 } from '@/modules/shared/uuid';
import { updateAccountAction } from '@/app/[companyId]/accounts/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createService } from '../../../factories/catalog.factory';
import { makeAccountContext, persistAccount, updatePayload } from './account-context';

function update(companyId: string, id: string, values: Record<string, string | number | undefined>) {
  return updateAccountAction(companyId, id, initialActionState, formData(values));
}

describe('Actualizar cuenta', () => {
  beforeEach(resetDb);

  it('an account header and its profiles update in a single call', async () => {
    const ctx = await makeAccountContext(db, 4);
    const { account } = await persistAccount(db, ctx, { email: 'orig@test.com' });
    setSessionUser(ctx.user);

    await expectRedirect(
      update(
        ctx.company.id,
        account.id,
        updatePayload({
          status: 'maintenance',
          notes: 'Revisar',
          profiles: [
            { number: 1, pin: '1111', status: 'occupied' },
            { number: 2, status: 'maintenance', notes: 'en revisión' },
          ],
        }),
      ),
      `/${ctx.company.id}/accounts/${account.id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row).toMatchObject({
      email: 'updated@test.com',
      cost: '20.00',
      nextRenewal: '2026-11-01',
      status: 'maintenance',
      notes: 'Revisar',
      code: account.code,
    });

    const rows = await db.select().from(profiles).where(eq(profiles.accountId, account.id)).orderBy(asc(profiles.number));
    expect(rows.map((p) => [p.number, p.pin, p.status, p.notes])).toEqual([
      [1, '1111', 'occupied', null],
      [2, null, 'maintenance', 'en revisión'],
      [3, null, 'available', null],
      [4, null, 'available', null],
    ]);
  });

  it('a blank password keeps the current one', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { password: 'keep-me' });
    setSessionUser(ctx.user);

    await expectRedirect(
      update(ctx.company.id, account.id, updatePayload({ password: '' })),
      `/${ctx.company.id}/accounts/${account.id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row.passwordEncrypted).toBe(account.passwordEncrypted);
    expect(decrypt(row.passwordEncrypted)).toBe('keep-me');
  });

  it('a new password is stored encrypted', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { password: 'old' });
    setSessionUser(ctx.user);

    await expectRedirect(
      update(ctx.company.id, account.id, updatePayload({ password: 'brand-new' })),
      `/${ctx.company.id}/accounts/${account.id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row.passwordEncrypted).not.toContain('brand-new');
    expect(decrypt(row.passwordEncrypted)).toBe('brand-new');
  });

  it('the service cannot be changed', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx);
    const otherService = await createService(db, { companyId: ctx.company.id });
    setSessionUser(ctx.user);

    await expectRedirect(
      update(ctx.company.id, account.id, updatePayload({ serviceId: otherService.id })),
      `/${ctx.company.id}/accounts/${account.id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row.serviceId).toBe(ctx.service.id);
  });

  it('updating a profile that does not belong to the account is rejected', async () => {
    const ctx = await makeAccountContext(db, 4);
    const { account } = await persistAccount(db, ctx);
    setSessionUser(ctx.user);

    const result = await update(ctx.company.id, account.id, updatePayload({ profiles: [{ number: 99, pin: '0000' }] }));

    expect(result.fieldErrors?.['profiles.0.number']?.[0]).toBe('El perfil 99 no pertenece a esta cuenta.');
    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row.email).toBe(account.email);
  });

  it('an invalid profile status value is rejected', async () => {
    const ctx = await makeAccountContext(db, 4);
    const { account } = await persistAccount(db, ctx);
    setSessionUser(ctx.user);

    const result = await update(ctx.company.id, account.id, updatePayload({ profiles: [{ number: 1, status: 'cancelled' }] }));

    expect(result.fieldErrors?.['profiles.0.status']?.[0]).toBe('El estado del perfil no es válido.');
  });

  it('an account keeps its own email but cannot take another account email of the same service', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { email: 'mine@test.com' });
    await persistAccount(db, ctx, { email: 'taken@test.com' });
    setSessionUser(ctx.user);

    await expectRedirect(
      update(ctx.company.id, account.id, updatePayload({ email: 'MINE@test.com' })),
      `/${ctx.company.id}/accounts/${account.id}`,
    );

    const result = await update(ctx.company.id, account.id, updatePayload({ email: 'Taken@test.com' }));
    expect(result.fieldErrors?.email?.[0]).toBe('Ya existe una cuenta con este email en el servicio.');
  });

  it('the status is required', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx);
    setSessionUser(ctx.user);

    const result = await update(ctx.company.id, account.id, updatePayload({ status: '' }));

    expect(result.fieldErrors?.status?.[0]).toBe('El estado no es válido.');
  });

  it('the next renewal cannot precede the purchase date', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx);
    setSessionUser(ctx.user);

    const result = await update(
      ctx.company.id,
      account.id,
      updatePayload({ purchaseDate: '2026-09-10', nextRenewal: '2026-09-01' }),
    );

    expect(result.fieldErrors?.nextRenewal?.[0]).toBe('La próxima renovación no puede ser anterior a la fecha de compra.');
  });

  it('updating a missing or foreign account returns an error', async () => {
    const ctx = await makeAccountContext(db);
    const other = await makeAccountContext(db);
    const { account: foreign } = await persistAccount(db, other);
    setSessionUser(ctx.user);

    expect(await update(ctx.company.id, uuidv7(), updatePayload())).toMatchObject({ message: 'Cuenta no encontrada.' });
    expect(await update(ctx.company.id, foreign.id, updatePayload())).toMatchObject({ message: 'Cuenta no encontrada.' });
    expect(await update(ctx.company.id, 'not-a-uuid', updatePayload())).toMatchObject({ message: 'Cuenta no encontrada.' });
  });

  it('a user without update permission cannot update an account', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { email: 'orig@test.com' });
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.show']);
    setSessionUser(ctx.user);

    const result = await update(ctx.company.id, account.id, updatePayload());

    expect(result.status).toBe('error');
    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row.email).toBe('orig@test.com');
  });
});
