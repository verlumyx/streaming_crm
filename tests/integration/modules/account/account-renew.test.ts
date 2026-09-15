import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { accountRenewals, accounts } from '@/modules/account/models/account.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { todayIsoDate } from '@/lib/format';
import { renewAccountAction } from '@/app/[companyId]/accounts/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { makeAccountContext, persistAccount } from './account-context';

function renew(companyId: string, id: string, values: Record<string, string | number | undefined>) {
  return renewAccountAction(companyId, id, initialActionState, formData({ id: uuidv7(), ...values }));
}

const period = { cost: '10.00', purchaseDate: '2026-06-01', nextRenewal: '2026-07-01' };

describe('Registrar renovación de cuenta', () => {
  beforeEach(resetDb);

  it('renewing records a renewal movement, advances the next renewal, updates the cost and writes the ledger', async () => {
    const ctx = await makeAccountContext(db, 3);
    const { account } = await persistAccount(db, ctx, period);
    setSessionUser(ctx.user);
    const renewalId = uuidv7();

    await expectRedirect(
      renew(ctx.company.id, account.id, { id: renewalId, amount: '12.50', nextRenewal: '2026-08-01', notes: 'Pago mensual' }),
      `/${ctx.company.id}/accounts/${account.id}`,
    );

    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row).toMatchObject({ nextRenewal: '2026-08-01', cost: '12.50' });

    const [renewal] = await db.select().from(accountRenewals).where(eq(accountRenewals.id, renewalId));
    expect(renewal).toMatchObject({
      companyId: ctx.company.id,
      accountId: account.id,
      type: 'renewal',
      amount: '12.50',
      periodStart: '2026-07-01',
      periodEnd: '2026-08-01',
      paidAt: todayIsoDate(),
      notes: 'Pago mensual',
      createdBy: ctx.user.id,
    });

    const ledger = await db.select().from(transactions).where(eq(transactions.relatedId, account.id));
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: 'expense',
      category: 'streaming_account_renewal',
      amount: '12.50',
      date: todayIsoDate(),
      paymentMethod: 'cash',
      periodFrom: '2026-07-01',
      periodTo: '2026-08-01',
      relatedType: 'Account',
      recordedBy: ctx.user.id,
      description: `Renovación de cuenta ${account.code}`,
    });
  });

  it('the new renewal date must be after the current next renewal', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, period);
    setSessionUser(ctx.user);

    for (const nextRenewal of ['2026-07-01', '2026-06-15']) {
      const result = await renew(ctx.company.id, account.id, { amount: '12.50', nextRenewal });
      expect(result.fieldErrors?.nextRenewal?.[0]).toBe(
        'La nueva fecha de vencimiento debe ser posterior al vencimiento actual.',
      );
    }

    expect(await db.select().from(accountRenewals)).toHaveLength(0);
    expect(await db.select().from(transactions)).toHaveLength(0);
    const [row] = await db.select().from(accounts).where(eq(accounts.id, account.id));
    expect(row).toMatchObject({ nextRenewal: '2026-07-01', cost: '10.00' });
  });

  it('the amount must be a non-negative number', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, period);
    setSessionUser(ctx.user);

    const result = await renew(ctx.company.id, account.id, { amount: '-5', nextRenewal: '2026-08-01' });

    expect(result.fieldErrors?.amount?.[0]).toBe('El monto no puede ser negativo.');
  });

  it('a foreign or missing account cannot be renewed', async () => {
    const ctx = await makeAccountContext(db);
    const other = await makeAccountContext(db);
    const { account: foreign } = await persistAccount(db, other, period);
    setSessionUser(ctx.user);

    expect(await renew(ctx.company.id, foreign.id, { amount: '1', nextRenewal: '2026-08-01' })).toMatchObject({
      message: 'Cuenta no encontrada.',
    });
    expect(await renew(ctx.company.id, 'nope', { amount: '1', nextRenewal: '2026-08-01' })).toMatchObject({
      message: 'Cuenta no encontrada.',
    });
    expect(await db.select().from(accountRenewals)).toHaveLength(0);
  });

  it('a user without the renew permission cannot renew', async () => {
    const ctx = await makeAccountContext(db);
    const { account } = await persistAccount(db, ctx, period);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.show']);
    setSessionUser(ctx.user);

    const result = await renew(ctx.company.id, account.id, { amount: '12.50', nextRenewal: '2026-08-01' });

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(accountRenewals)).toHaveLength(0);
  });
});
