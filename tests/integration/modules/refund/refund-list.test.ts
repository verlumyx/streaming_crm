import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { refunds } from '@/modules/refund/models/refund.model';
import RefundsPage from '@/app/[companyId]/refunds/page';
import RefundShowPage from '@/app/[companyId]/refunds/[id]/page';
import { approveRefundAction } from '@/app/[companyId]/refunds/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectNotFound, expectRedirect } from '../../../helpers/session-mock';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { createRefund } from '../../../factories/refund.factory';
import { refundContext } from './refund-test-utils';

type Item = { id: string };

const list = (companyId: string, searchParams: Record<string, string> = {}) =>
  RefundsPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });

const show = (companyId: string, id: string, searchParams: Record<string, string> = {}) =>
  RefundShowPage({ params: Promise.resolve({ companyId, id }), searchParams: Promise.resolve(searchParams) });

describe('Listar reembolsos', () => {
  beforeEach(resetDb);

  it('renders the refunds of the company with their sale and client, newest first', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx, { price: '15.00' });
    const older = await createRefund(db, sale, { amount: '5.00' });
    const newer = await createRefund(db, sale, { amount: '7.50', status: 'approved' });
    await db.update(refunds).set({ createdAt: new Date('2026-01-01T00:00:00Z') }).where(eq(refunds.id, older.id));
    const other = await makeSaleContext(db);
    await createRefund(db, await persistSale(db, other));

    const element = await list(ctx.company.id);

    expect(element.props.refunds.map((r: Item) => r.id)).toEqual([newer.id, older.id]);
    expect(element.props.refunds[0]).toMatchObject({
      code: newer.code,
      amount: 7.5,
      status: 'approved',
      isPending: false,
      sale: { id: sale.id, code: sale.code, status: 'active', price: 15 },
      client: { id: ctx.client.id, name: ctx.client.name },
    });
    expect(element.props.meta).toEqual({ total: 2, limit: 10, offset: 0, hasMore: false });
  });

  it('filters by q (code or reason, case-insensitive, wildcards literal), status and sale', async () => {
    const ctx = await refundContext();
    const saleOne = await persistSale(db, ctx, { profileIndex: 0 });
    const saleTwo = await persistSale(db, ctx, { profileIndex: 1 });
    const byReason = await createRefund(db, saleOne, { reason: 'Cliente INSATISFECHO 100%' });
    const byCode = await createRefund(db, saleTwo, { status: 'rejected' });
    const plain = await createRefund(db, saleTwo, { reason: 'Otro motivo 1000' });

    const ids = async (params: Record<string, string>) => (await list(ctx.company.id, params)).props.refunds.map((r: Item) => r.id);

    expect(await ids({ q: 'insatisfecho' })).toEqual([byReason.id]);
    expect(await ids({ q: byCode.code.toLowerCase() })).toEqual([byCode.id]);
    expect(await ids({ q: '100%' })).toEqual([byReason.id]);
    expect(await ids({ status: 'rejected' })).toEqual([byCode.id]);
    expect((await ids({ saleId: saleTwo.id })).sort()).toEqual([byCode.id, plain.id].sort());
    expect(await ids({ saleId: saleTwo.id, status: 'pending' })).toEqual([plain.id]);
    expect(await ids({ status: 'unknown' })).toHaveLength(3);
  });

  it('filters are scoped to the company', async () => {
    const ctx = await refundContext();
    const other = await makeSaleContext(db);
    const foreignSale = await persistSale(db, other);
    const foreign = await createRefund(db, foreignSale);

    const element = await list(ctx.company.id, { saleId: foreignSale.id, q: foreign.code });

    expect(element.props.refunds).toHaveLength(0);
  });
});

describe('Ver reembolso', () => {
  beforeEach(resetDb);

  it('renders the refund with its users and, once approved, the ledger expense', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale, { amount: '40.00', reason: 'Parcial', requestedBy: ctx.user.id });

    const pending = await show(ctx.company.id, refund.id);
    expect(pending.props.refund).toMatchObject({
      id: refund.id,
      isPending: true,
      reason: 'Parcial',
      requestedByUser: { id: ctx.user.id, name: ctx.user.name },
      resolvedByUser: null,
      transactions: [],
    });
    expect(pending.props).toMatchObject({ canUpdate: true, canApprove: true, canReject: true, initialEditing: false });

    await expectRedirect(approveRefundAction(ctx.company.id, refund.id), `/${ctx.company.id}/refunds/`);

    const approved = await show(ctx.company.id, refund.id);
    expect(approved.props.refund).toMatchObject({ status: 'approved', resolvedByUser: { id: ctx.user.id } });
    expect(approved.props.refund.transactions).toHaveLength(1);
    expect(approved.props.refund.transactions[0]).toMatchObject({
      type: 'expense',
      category: 'refund',
      amount: 40,
      description: `Reembolso venta ${sale.code} a ${ctx.client.name}`,
    });
  });

  it('?edit=1 opens the inline form only while the refund is pending', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const pending = await createRefund(db, sale);
    const approved = await createRefund(db, sale, { status: 'approved' });

    expect((await show(ctx.company.id, pending.id, { edit: '1' })).props.initialEditing).toBe(true);
    expect((await show(ctx.company.id, approved.id, { edit: '1' })).props.initialEditing).toBe(false);
  });

  it('a refund of another company, or an invalid id, is not found', async () => {
    const ctx = await refundContext();
    const other = await makeSaleContext(db);
    const refund = await createRefund(db, await persistSale(db, other));

    await expectNotFound(show(ctx.company.id, refund.id));
    await expectNotFound(show(ctx.company.id, 'not-a-uuid'));
  });
});
