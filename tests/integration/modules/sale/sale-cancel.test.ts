import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { profiles } from '@/modules/account/models/account.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { refunds } from '@/modules/refund/models/refund.model';
import { createSaleContainer } from '@/modules/sale/container';
import { cancelSaleAction } from '@/app/[companyId]/sales/actions';
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
  refundsOf,
  reloadSale,
  saleEnding,
} from './sale-test-utils';

async function context(): Promise<SaleContext> {
  const ctx = await makeSaleContext(db);
  setSessionUser(ctx.user);
  return ctx;
}

const cancel = (ctx: SaleContext, saleId: string, values: Record<string, string | number> = {}) =>
  cancelSaleAction(ctx.company.id, saleId, initialActionState, form(values));

describe('Expulsar venta', () => {
  beforeEach(resetDb);

  it('cancelling a sale marks it cancelled and frees its profiles', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));

    await expectRedirect(cancel(ctx, sale.id, { cancellationReason: 'Falta de pago' }), `/${ctx.company.id}/sales/${sale.id}`);

    const row = await reloadSale(sale.id);
    expect(row.status).toBe('cancelled');
    expect(row.cancelledAt).toBeInstanceOf(Date);
    expect(row.cancellationReason).toBe('Falta de pago');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
  });

  it('cancelling a sale does not create any transaction nor a refund by default', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));

    await expectRedirect(cancel(ctx, sale.id, { cancellationReason: 'Falta de pago', refundAmount: 5 }), `/${ctx.company.id}/sales/`);

    expect(await ledgerOf(sale.id)).toHaveLength(0);
    expect(await db.select().from(transactions)).toHaveLength(0);
    expect(await refundsOf(sale.id)).toHaveLength(0);
  });

  it('cancelling with a refund creates a pending refund with the next code', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10), { price: '15.00' });

    await expectRedirect(
      cancel(ctx, sale.id, { cancellationReason: 'Cliente insatisfecho', createRefund: 'on', refundAmount: '7.5' }),
      `/${ctx.company.id}/sales/${sale.id}`,
    );

    const [refund] = await refundsOf(sale.id);
    expect(refund).toMatchObject({
      companyId: ctx.company.id,
      code: 'REF000001',
      saleId: sale.id,
      clientId: ctx.client.id,
      amount: '7.50',
      reason: 'Cliente insatisfecho',
      status: 'pending',
      requestedBy: ctx.user.id,
      resolvedBy: null,
    });
    expect(await db.select().from(transactions)).toHaveLength(0);
  });

  it('the refund reason can differ from the cancellation reason and codes increase per company', async () => {
    const ctx = await makeSaleContext(db, 4);
    setSessionUser(ctx.user);
    const a = await saleEnding(ctx, daysFromToday(10), { profileIndex: 0 });
    const b = await saleEnding(ctx, daysFromToday(10), { profileIndex: 1 });

    await expectRedirect(cancel(ctx, a.id, { cancellationReason: 'x', createRefund: 'true', refundAmount: 3 }), `/${ctx.company.id}/sales/`);
    await expectRedirect(
      cancel(ctx, b.id, { cancellationReason: 'y', createRefund: 'true', refundAmount: 4, refundReason: 'Parcial' }),
      `/${ctx.company.id}/sales/`,
    );

    const rows = await db.select().from(refunds).where(eq(refunds.companyId, ctx.company.id));
    expect(rows.map((r) => [r.code, r.reason]).sort()).toEqual([
      ['REF000001', 'x'],
      ['REF000002', 'Parcial'],
    ]);
  });

  it('the cancellation reason is required and limited; a refund needs an amount of at least 0.01', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));

    const missing = await cancel(ctx, sale.id, {});
    const tooLong = await cancel(ctx, sale.id, { cancellationReason: 'x'.repeat(256) });
    const noAmount = await cancel(ctx, sale.id, { cancellationReason: 'x', createRefund: 'on' });
    const zero = await cancel(ctx, sale.id, { cancellationReason: 'x', createRefund: 'on', refundAmount: 0 });
    const longRefundReason = await cancel(ctx, sale.id, {
      cancellationReason: 'x',
      createRefund: 'on',
      refundAmount: 1,
      refundReason: 'y'.repeat(256),
    });

    expect(missing.fieldErrors?.cancellationReason?.[0]).toBe('El motivo es obligatorio.');
    expect(tooLong.fieldErrors?.cancellationReason?.[0]).toBe('El motivo no puede superar 255 caracteres.');
    expect(noAmount.fieldErrors?.refundAmount?.[0]).toBe('El monto a reembolsar es obligatorio.');
    expect(zero.fieldErrors?.refundAmount?.[0]).toBe('El monto a reembolsar debe ser al menos 0,01.');
    expect(longRefundReason.fieldErrors?.refundReason?.[0]).toBe('La razón del reembolso no puede superar 255 caracteres.');
    expect((await reloadSale(sale.id)).status).toBe('active');
    expect(await refundsOf(sale.id)).toHaveLength(0);
  });

  it('cancelling an old sale does not free a profile that a newer sale holds', async () => {
    const ctx = await context();
    const old = await saleEnding(ctx, daysFromToday(-15), { status: 'expired' });
    await db.update(profiles).set({ status: 'available' }).where(eq(profiles.id, ctx.profiles[0].id));
    await saleEnding(ctx, daysFromToday(20), { status: 'active', profileIndex: 0 });

    await expectRedirect(cancel(ctx, old.id, { cancellationReason: 'Limpieza' }), `/${ctx.company.id}/sales/`);

    expect((await reloadSale(old.id)).status).toBe('cancelled');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
  });

  it('a sale cannot be expelled twice and a missing sale is not found', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10), { status: 'cancelled' });

    expect((await cancel(ctx, sale.id, { cancellationReason: 'x' })).fieldErrors?.id?.[0]).toBe('Esta venta ya fue expulsada.');
    expect(await cancel(ctx, uuidv7(), { cancellationReason: 'x' })).toMatchObject({ message: 'Venta no encontrada.' });
  });

  it('SaleRepository.cancel is reusable on its own (refund approval flow)', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));

    await db.transaction(async (tx) => {
      await createSaleContainer(tx).repository.cancel(sale, 'Reembolso aprobado');
    });

    expect(await reloadSale(sale.id)).toMatchObject({ status: 'cancelled', cancellationReason: 'Reembolso aprobado' });
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
  });

  it('a user without cancel permission cannot cancel', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(10));
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.list', 'sales.show']);

    const result = await cancel(ctx, sale.id, { cancellationReason: 'x' });

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN_MESSAGE });
    expect((await reloadSale(sale.id)).status).toBe('active');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
  });
});
