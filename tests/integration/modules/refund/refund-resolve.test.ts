import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { approveRefundAction, rejectRefundAction } from '@/app/[companyId]/refunds/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect } from '../../../helpers/session-mock';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { createRefund } from '../../../factories/refund.factory';
import { profileStatus, reloadSale } from '../sale/sale-test-utils';
import { allLedger, ledgerOfRefund, refundContext, reloadRefund, RESOLVED_MESSAGE } from './refund-test-utils';

describe('Aprobar reembolso', () => {
  beforeEach(resetDb);

  it('approving a refund for an active sale cancels it, frees its profiles and records one expense', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale, { amount: '40.00', requestedBy: ctx.user.id });

    await expectRedirect(approveRefundAction(ctx.company.id, refund.id), `/${ctx.company.id}/refunds/${refund.id}`);

    const saleRow = await reloadSale(sale.id);
    expect(saleRow).toMatchObject({ status: 'cancelled', cancellationReason: `Reembolso ${refund.code}` });
    expect(saleRow.cancelledAt).toBeInstanceOf(Date);
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');

    const approved = await reloadRefund(refund.id);
    expect(approved).toMatchObject({ status: 'approved', resolvedBy: ctx.user.id });
    expect(approved.resolvedAt).toBeInstanceOf(Date);

    const ledger = await ledgerOfRefund(refund.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      companyId: ctx.company.id,
      type: 'expense',
      category: 'refund',
      amount: '40.00',
      date: todayIsoDate(),
      paymentMethod: 'cash',
      description: `Reembolso venta ${sale.code} a ${ctx.client.name}`,
      relatedType: 'Refund',
      relatedId: refund.id,
      recordedBy: ctx.user.id,
    });
  });

  it('approving a refund whose sale is already cancelled leaves the sale alone and only records the expense', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx, { status: 'cancelled' });
    const refund = await createRefund(db, sale, { amount: '25.00' });

    await expectRedirect(approveRefundAction(ctx.company.id, refund.id), `/${ctx.company.id}/refunds/`);

    expect(await reloadSale(sale.id)).toMatchObject({ status: 'cancelled', cancelledAt: null, cancellationReason: null });
    expect(await ledgerOfRefund(refund.id)).toHaveLength(1);
    expect((await reloadRefund(refund.id)).status).toBe('approved');
  });

  it('concurrent approvals produce exactly one ledger entry and one sale cancellation', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale);

    const results = await Promise.allSettled([
      approveRefundAction(ctx.company.id, refund.id),
      approveRefundAction(ctx.company.id, refund.id),
    ]);

    expect(await allLedger()).toHaveLength(1);
    expect((await reloadSale(sale.id)).cancellationReason).toBe(`Reembolso ${refund.code}`);
    expect((await reloadRefund(refund.id)).status).toBe('approved');
    const outcomes = results.map((r) => (r.status === 'fulfilled' ? r.value.message : String(r.reason)));
    expect(outcomes.filter((o) => o === RESOLVED_MESSAGE)).toHaveLength(1);
  });

  it('an already resolved refund cannot be approved or rejected again', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale);
    await expectRedirect(approveRefundAction(ctx.company.id, refund.id), `/${ctx.company.id}/refunds/`);

    expect(await approveRefundAction(ctx.company.id, refund.id)).toMatchObject({ status: 'error', message: RESOLVED_MESSAGE });
    expect(await rejectRefundAction(ctx.company.id, refund.id)).toMatchObject({ status: 'error', message: RESOLVED_MESSAGE });
    expect(await allLedger()).toHaveLength(1);
    expect((await reloadRefund(refund.id)).status).toBe('approved');
  });

  it('a rejected refund cannot be approved', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale, { status: 'rejected' });

    expect(await approveRefundAction(ctx.company.id, refund.id)).toMatchObject({ status: 'error', message: RESOLVED_MESSAGE });
    expect(await allLedger()).toHaveLength(0);
    expect((await reloadSale(sale.id)).status).toBe('active');
  });

  it('a refund of another company cannot be resolved', async () => {
    const ctx = await refundContext();
    const other = await makeSaleContext(db);
    const sale = await persistSale(db, other);
    const refund = await createRefund(db, sale);

    expect(await approveRefundAction(ctx.company.id, refund.id)).toMatchObject({ status: 'error', message: 'Reembolso no encontrado.' });
    expect(await rejectRefundAction(ctx.company.id, refund.id)).toMatchObject({ status: 'error', message: 'Reembolso no encontrado.' });
    expect((await reloadRefund(refund.id)).status).toBe('pending');
    expect((await reloadSale(sale.id)).status).toBe('active');
  });
});

describe('Rechazar reembolso', () => {
  beforeEach(resetDb);

  it('rejecting a refund leaves the sale untouched and records no transaction', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale, { amount: '40.00' });

    await expectRedirect(rejectRefundAction(ctx.company.id, refund.id), `/${ctx.company.id}/refunds/${refund.id}`);

    const rejected = await reloadRefund(refund.id);
    expect(rejected).toMatchObject({ status: 'rejected', resolvedBy: ctx.user.id });
    expect(rejected.resolvedAt).toBeInstanceOf(Date);
    expect((await reloadSale(sale.id)).status).toBe('active');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect(await allLedger()).toHaveLength(0);
  });

  it('an already rejected refund cannot be rejected again', async () => {
    const ctx = await refundContext();
    const refund = await createRefund(db, await persistSale(db, ctx), { status: 'rejected' });

    expect(await rejectRefundAction(ctx.company.id, refund.id)).toMatchObject({ status: 'error', message: RESOLVED_MESSAGE });
  });
});
