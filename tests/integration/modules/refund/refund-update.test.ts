import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { updateRefundAction } from '@/app/[companyId]/refunds/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect } from '../../../helpers/session-mock';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { formData } from '../../../helpers/form-data';
import { createRefund } from '../../../factories/refund.factory';
import { refundContext, reloadRefund, RESOLVED_MESSAGE } from './refund-test-utils';

const update = (companyId: string, id: string, values: Record<string, string | number | undefined>) =>
  updateRefundAction(companyId, id, initialActionState, formData(values));

describe('Actualizar reembolso', () => {
  beforeEach(resetDb);

  it('updates the amount and the reason of a pending refund, keeping the sale', async () => {
    const ctx = await refundContext();
    const sale = await persistSale(db, ctx);
    const refund = await createRefund(db, sale, { amount: '30.00', reason: 'Original' });

    await expectRedirect(
      update(ctx.company.id, refund.id, { amount: '12.5', reason: 'Parcial', saleId: '0192f3a0-0000-7000-8000-0000000000ff' }),
      `/${ctx.company.id}/refunds/${refund.id}`,
    );

    expect(await reloadRefund(refund.id)).toMatchObject({ amount: '12.50', reason: 'Parcial', saleId: sale.id, status: 'pending' });
  });

  it('clearing the reason stores null', async () => {
    const ctx = await refundContext();
    const refund = await createRefund(db, await persistSale(db, ctx), { reason: 'Original' });

    await expectRedirect(update(ctx.company.id, refund.id, { amount: 10, reason: '' }), `/${ctx.company.id}/refunds/`);

    expect((await reloadRefund(refund.id)).reason).toBeNull();
  });

  it('validates the amount', async () => {
    const ctx = await refundContext();
    const refund = await createRefund(db, await persistSale(db, ctx));

    const result = await update(ctx.company.id, refund.id, { amount: '0' });

    expect(result.fieldErrors?.amount).toEqual(['El monto debe ser mayor a 0.']);
    expect((await reloadRefund(refund.id)).amount).toBe('10.00');
  });

  it.each(['approved', 'rejected'] as const)('a %s refund cannot be updated', async (status) => {
    const ctx = await refundContext();
    const refund = await createRefund(db, await persistSale(db, ctx), { status });

    const result = await update(ctx.company.id, refund.id, { amount: 99 });

    expect(result).toMatchObject({ status: 'error', message: RESOLVED_MESSAGE });
    expect((await reloadRefund(refund.id)).amount).toBe('10.00');
  });

  it('a refund of another company is not found', async () => {
    const ctx = await refundContext();
    const other = await makeSaleContext(db);
    const refund = await createRefund(db, await persistSale(db, other));

    expect(await update(ctx.company.id, refund.id, { amount: 99 })).toMatchObject({
      status: 'error',
      message: 'Reembolso no encontrado.',
    });
    expect(await update(ctx.company.id, 'not-a-uuid', { amount: 99 })).toMatchObject({ status: 'error' });
    expect((await reloadRefund(refund.id)).amount).toBe('10.00');
  });
});
