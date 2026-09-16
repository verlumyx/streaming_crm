import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { addDays } from '@/lib/format';
import { saleEndDate } from '@/modules/sale/domain/sale-rules';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { renewSaleAction } from '@/app/[companyId]/sales/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import {
  daysFromToday,
  FORBIDDEN_MESSAGE,
  form,
  ledgerOf,
  profileStatus,
  reloadSale,
  renewalsOf,
  saleEnding,
  saleProfileIds,
  today,
} from './sale-test-utils';

async function context(): Promise<SaleContext> {
  const ctx = await makeSaleContext(db);
  setSessionUser(ctx.user);
  return ctx;
}

const renew = (ctx: SaleContext, saleId: string, values: Record<string, string | number> = {}) =>
  renewSaleAction(ctx.company.id, saleId, initialActionState, form({ id: uuidv7(), ...values }));

describe('Renovar venta', () => {
  beforeEach(resetDb);

  it('an active sale can be renewed extending its end date from the current one', async () => {
    const ctx = await context();
    const endDate = daysFromToday(5);
    const sale = await saleEnding(ctx, endDate);
    const renewalId = uuidv7();

    await expectRedirect(
      renewSaleAction(ctx.company.id, sale.id, initialActionState, form({ id: renewalId })),
      `/${ctx.company.id}/sales/${sale.id}`,
    );

    const row = await reloadSale(sale.id);
    expect(row).toMatchObject({ status: 'active', endDate: saleEndDate(endDate, 30), price: '10.00', durationDays: 30 });

    const renewals = await renewalsOf(sale.id);
    expect(renewals).toHaveLength(1);
    expect(renewals[0]).toMatchObject({
      id: renewalId,
      renewedAt: today(),
      previousEndDate: endDate,
      newEndDate: saleEndDate(endDate, 30),
      durationDays: 30,
      price: '10.00',
      renewedBy: ctx.user.id,
    });
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect(await saleProfileIds(sale.id)).toEqual([ctx.profiles[0].id]);
  });

  it('renewing records an income transaction with the renewal category, custom duration and price', async () => {
    const ctx = await context();
    const endDate = daysFromToday(2);
    const sale = await saleEnding(ctx, endDate);

    await expectRedirect(renew(ctx, sale.id, { durationDays: 60, price: '75.5', notes: 'Pago anticipado' }), `/${ctx.company.id}/sales/`);

    const newEnd = addDays(endDate, 60);
    expect((await reloadSale(sale.id)).endDate).toBe(newEnd);
    expect((await renewalsOf(sale.id))[0]).toMatchObject({ durationDays: 60, price: '75.50', notes: 'Pago anticipado' });

    const ledger = await ledgerOf(sale.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: 'income',
      category: 'renewal',
      amount: '75.50',
      date: today(),
      description: `Renovación de venta ${sale.code}`,
      relatedType: 'Sale',
      periodFrom: today(),
      periodTo: newEnd,
      recordedBy: ctx.user.id,
    });
  });

  it('an expired sale within the grace period can be renewed (boundary included)', async () => {
    const ctx = await makeSaleContext(db, 4);
    setSessionUser(ctx.user);
    const yesterday = await saleEnding(ctx, daysFromToday(-1), { status: 'expired', profileIndex: 0 });
    const boundary = await saleEnding(ctx, daysFromToday(-3), { status: 'expired', profileIndex: 1 });

    await expectRedirect(renew(ctx, yesterday.id), `/${ctx.company.id}/sales/${yesterday.id}`);
    await expectRedirect(renew(ctx, boundary.id), `/${ctx.company.id}/sales/${boundary.id}`);

    expect(await reloadSale(yesterday.id)).toMatchObject({ status: 'active', endDate: saleEndDate(daysFromToday(-1), 30) });
    expect(await reloadSale(boundary.id)).toMatchObject({ status: 'active', endDate: saleEndDate(daysFromToday(-3), 30) });
  });

  it('an expired sale outside the grace period cannot be renewed', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-4), { status: 'expired' });

    const result = await renew(ctx, sale.id);

    expect(result).toMatchObject({
      status: 'error',
      message: 'Esta venta no puede renovarse en su estado actual. Usa la reactivación.',
      fieldErrors: { id: ['Esta venta no puede renovarse en su estado actual. Usa la reactivación.'] },
    });
    expect((await reloadSale(sale.id)).status).toBe('expired');
    expect(await renewalsOf(sale.id)).toHaveLength(0);
    expect(await ledgerOf(sale.id)).toHaveLength(0);
  });

  it('a cancelled sale cannot be renewed', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10), { status: 'cancelled' });

    const result = await renew(ctx, sale.id);

    expect(result.fieldErrors?.id?.[0]).toBe('Esta venta no puede renovarse en su estado actual. Usa la reactivación.');
  });

  it('duration and price are validated', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));

    const result = await renew(ctx, sale.id, { durationDays: 0, price: -1 });
    const noId = await renewSaleAction(ctx.company.id, sale.id, initialActionState, form({}));

    expect(result.fieldErrors).toMatchObject({
      durationDays: ['La duración debe ser al menos 1.'],
      price: ['El precio debe ser al menos 0.'],
    });
    expect(noId.fieldErrors?.id?.[0]).toBe('El identificador no es válido.');
    expect(await renewalsOf(sale.id)).toHaveLength(0);
  });

  it('renewing a missing sale or a sale of another company returns not found', async () => {
    const ctx = await context();
    const foreign = await makeSaleContext(db);
    const foreignSale = await saleEnding(foreign, daysFromToday(10));
    setSessionUser(ctx.user);

    expect(await renew(ctx, uuidv7())).toMatchObject({ status: 'error', message: 'Venta no encontrada.' });
    expect(await renew(ctx, 'not-a-uuid')).toMatchObject({ status: 'error', message: 'Venta no encontrada.' });
    expect(await renew(ctx, foreignSale.id)).toMatchObject({ status: 'error', message: 'Venta no encontrada.' });
  });

  it('returnTo is honored only for paths of the same company', async () => {
    const ctx = await makeSaleContext(db, 4);
    setSessionUser(ctx.user);
    const a = await saleEnding(ctx, daysFromToday(10), { profileIndex: 0 });
    const b = await saleEnding(ctx, daysFromToday(10), { profileIndex: 1 });

    await expectRedirect(
      renew(ctx, a.id, { returnTo: `/${ctx.company.id}/reports/expirations?days=7` }),
      `/${ctx.company.id}/reports/expirations?days=7`,
    );
    await expectRedirect(renew(ctx, b.id, { returnTo: 'https://evil.test/x' }), `/${ctx.company.id}/sales/${b.id}`);
  });

  it('a user without renew permission cannot renew', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.list', 'sales.show']);

    const result = await renew(ctx, sale.id);

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN_MESSAGE });
    expect(await renewalsOf(sale.id)).toHaveLength(0);
  });
});
