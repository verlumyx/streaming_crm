import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/client';
import { revealAccountCredentialsAction } from '@/app/[companyId]/accounts/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeAccountContext, persistAccount } from './account-context';

describe('Ver credenciales de cuenta', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it('an authorized user gets the decrypted credentials', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { email: 'creds@test.com', password: 'the-real-password' });
    setSessionUser(ctx.user);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = await revealAccountCredentialsAction(ctx.company.id, account.id);

    expect(result).toEqual({ status: 'ok', email: 'creds@test.com', password: 'the-real-password' });
  });

  it('each credentials access is logged', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx);
    setSessionUser(ctx.user);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await revealAccountCredentialsAction(ctx.company.id, account.id);

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith({
      event: 'account.credentials.accessed',
      userId: ctx.user.id,
      accountId: account.id,
      companyId: ctx.company.id,
      code: account.code,
    });
  });

  it('a user without the credentials permission is forbidden and nothing is logged', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.list', 'accounts.show']);
    setSessionUser(ctx.user);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = await revealAccountCredentialsAction(ctx.company.id, account.id);

    expect(result).toEqual({ status: 'error', message: 'No tienes permiso para ver las credenciales.' });
    expect(info).not.toHaveBeenCalled();
  });

  it('the credentials permission alone is enough', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, { password: 'solo' });
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.credentials']);
    setSessionUser(ctx.user);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    expect(await revealAccountCredentialsAction(ctx.company.id, account.id)).toMatchObject({ status: 'ok', password: 'solo' });
  });

  it('credentials of another company account or an invalid id are not found', async () => {
    const ctx = await makeAccountContext(db);
    const other = await makeAccountContext(db);
    const { account: foreign } = await persistAccount(db, other);
    setSessionUser(ctx.user);

    expect(await revealAccountCredentialsAction(ctx.company.id, foreign.id)).toEqual({
      status: 'error',
      message: 'Cuenta no encontrada.',
    });
    expect(await revealAccountCredentialsAction(ctx.company.id, 'x')).toMatchObject({ message: 'Cuenta no encontrada.' });
  });
});
