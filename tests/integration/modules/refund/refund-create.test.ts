import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { refunds } from '@/modules/refund/models/refund.model';
import { cancelSaleAction } from '@/app/[companyId]/sales/actions';
import RefundCreatePage from '@/app/[companyId]/refunds/create/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { formData } from '../../../helpers/form-data';
import { createClient } from '../../../factories/client.factory';
import { allLedger, allRefunds, refundContext, submitCreate } from './refund-test-utils';

describe('Crear reembolso', () => {
  beforeEach(resetDb);

  it('creates a pending refund with the sale client, the session user and no ledger entry', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);

    const id = '0192f3a0-0000-7000-8000-0000000000aa';
    await expectRedirect(
      submitCreate(ctx.company.id, { id, saleId: sale.id, amount: '30.50', reason: 'Cliente insatisfecho' }),
      `/${ctx.company.id}/refunds/${id}`,
    );

    const [refund] = await db.select().from(refunds).where(eq(refunds.id, id));
    expect(refund).toMatchObject({
      companyId: ctx.company.id,
      code: 'REF000001',
      saleId: sale.id,
      clientId: sale.clientId,
      amount: '30.50',
      reason: 'Cliente insatisfecho',
      status: 'pending',
      requestedBy: ctx.user.id,
      resolvedBy: null,
      resolvedAt: null,
    });
    expect(await allLedger()).toHaveLength(0);
  });

  it('the code is sequential per company', async () => {
    const ctx = await refundContext();
    const saleOne = await persistSale(db, ctx, { profileIndex: 0 });
    const saleTwo = await persistSale(db, ctx, { profileIndex: 1 });

    for (const sale of [saleOne, saleTwo]) {
      await expectRedirect(submitCreate(ctx.company.id, { saleId: sale.id, amount: 10 }), `/${ctx.company.id}/refunds/`);
    }

    const other = await makeSaleContext(db);
    setSessionUser(other.user);
    const otherSale = await persistSale(db, other);
    await expectRedirect(submitCreate(other.company.id, { saleId: otherSale.id, amount: 10 }), `/${other.company.id}/refunds/`);

    const rows = await allRefunds();
    expect(rows.filter((r) => r.companyId === ctx.company.id).map((r) => r.code)).toEqual(['REF000001', 'REF000002']);
    expect(rows.filter((r) => r.companyId === other.company.id).map((r) => r.code)).toEqual(['REF000001']);
  });

  it('a cancelled sale admits a refund', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx, { status: 'cancelled' });

    await expectRedirect(submitCreate(ctx.company.id, { saleId: sale.id, amount: 5 }), `/${ctx.company.id}/refunds/`);

    expect(await allRefunds()).toHaveLength(1);
  });

  it('amount is required and must be at least 0.01', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);

    const zero = await submitCreate(ctx.company.id, { saleId: sale.id, amount: 0 });
    const missing = await submitCreate(ctx.company.id, { saleId: sale.id });

    expect(zero.fieldErrors?.amount).toEqual(['El monto debe ser mayor a 0.']);
    expect(missing.fieldErrors?.amount).toEqual(['El monto es obligatorio.']);
    expect(await allRefunds()).toHaveLength(0);
  });

  it('the sale is required, must belong to the company and be active or cancelled', async () => {
    const ctx = await refundContext();
    const expired = await persistSale(db, ctx, { status: 'expired' });
    const other = await makeSaleContext(db);
    const foreign = await persistSale(db, other);

    expect((await submitCreate(ctx.company.id, { amount: 10 })).fieldErrors?.saleId).toEqual(['La venta es obligatoria.']);
    for (const saleId of [expired.id, foreign.id, '0192f3a0-0000-7000-8000-0000000000ff']) {
      const result = await submitCreate(ctx.company.id, { saleId, amount: 10 });
      expect(result).toMatchObject({ status: 'error', fieldErrors: { saleId: ['La venta no existe o no admite reembolsos.'] } });
    }
    expect(await allRefunds()).toHaveLength(0);
  });

  it('the reason is optional and limited to 255 characters', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);

    const result = await submitCreate(ctx.company.id, { saleId: sale.id, amount: 10, reason: 'x'.repeat(256) });

    expect(result.fieldErrors?.reason).toEqual(['La razón no puede superar 255 caracteres.']);
  });

  it('manual refunds and refunds requested when expelling a sale share the code sequence', async () => {
    const ctx = await refundContext();
    const manualSale = await persistSale(db, ctx, { profileIndex: 0 });
    const expelledSale = await persistSale(db, ctx, { profileIndex: 1 });

    await expectRedirect(submitCreate(ctx.company.id, { saleId: manualSale.id, amount: 10 }), `/${ctx.company.id}/refunds/`);
    await expectRedirect(
      cancelSaleAction(
        ctx.company.id,
        expelledSale.id,
        initialActionState,
        formData({ cancellationReason: 'Falta de pago', createRefund: 'on', refundAmount: '7.5' }),
      ),
      `/${ctx.company.id}/sales/${expelledSale.id}`,
    );

    const rows = await allRefunds();
    expect(rows.map((r) => [r.code, r.saleId, r.amount, r.status])).toEqual([
      ['REF000001', manualSale.id, '10.00', 'pending'],
      ['REF000002', expelledSale.id, '7.50', 'pending'],
    ]);
  });
});

describe('Crear reembolso (form)', () => {
  beforeEach(resetDb);

  it('lists only the active and cancelled sales of the company, newest first', async () => {
    const ctx = await refundContext();
    const active = await persistSale(db, ctx, { profileIndex: 0, price: '15.00' });
    const cancelled = await persistSale(db, ctx, { profileIndex: 1, status: 'cancelled' });
    await persistSale(db, ctx, { profileIndex: 2, status: 'expired' });
    const other = await createUserWithCompany(db);
    await createClient(db, { companyId: other.company.id });

    const element = await RefundCreatePage({ params: Promise.resolve({ companyId: ctx.company.id }) });
    const create = element.props.children;

    expect(create.props.sales).toEqual([
      { id: cancelled.id, code: cancelled.code, clientName: ctx.client.name, price: 10, status: 'cancelled' },
      { id: active.id, code: active.code, clientName: ctx.client.name, price: 15, status: 'active' },
    ]);
    expect(create.props.initialId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
