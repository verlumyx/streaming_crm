import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createRefundSchema } from '@/modules/refund/validation/create-refund.schema';
import { updateRefundSchema } from '@/modules/refund/validation/update-refund.schema';
import { searchRefundSchema } from '@/modules/refund/validation/search-refund.schema';

const ID = '0192f3a0-0000-7000-8000-000000000001';
const SALE = '0192f3a0-0000-7000-8000-000000000002';

const errorsOf = (result: { success: boolean; error?: z.ZodError }): Record<string, string[] | undefined> =>
  z.flattenError(result.error!).fieldErrors;

describe('createRefundSchema', () => {
  it('coerces the amount and normalizes an empty reason', () => {
    expect(createRefundSchema.parse({ id: ID, saleId: SALE, amount: '30.5', reason: '' })).toEqual({
      id: ID,
      saleId: SALE,
      amount: 30.5,
      reason: null,
    });
  });

  it('requires the sale and a positive amount', () => {
    const missing = createRefundSchema.safeParse({ id: ID, saleId: '', amount: '' });
    expect(errorsOf(missing)).toMatchObject({
      saleId: ['La venta es obligatoria.'],
      amount: ['El monto es obligatorio.'],
    });

    const zero = createRefundSchema.safeParse({ id: ID, saleId: 'not-a-uuid', amount: '0' });
    expect(errorsOf(zero)).toMatchObject({ saleId: ['La venta no existe.'], amount: ['El monto debe ser mayor a 0.'] });
  });

  it('accepts the minimum amount and limits the reason to 255 characters', () => {
    expect(createRefundSchema.safeParse({ id: ID, saleId: SALE, amount: '0.01' }).success).toBe(true);
    const long = createRefundSchema.safeParse({ id: ID, saleId: SALE, amount: '1', reason: 'x'.repeat(256) });
    expect(errorsOf(long).reason).toEqual(['La razón no puede superar 255 caracteres.']);
  });
});

describe('updateRefundSchema', () => {
  it('only keeps amount and reason', () => {
    expect(updateRefundSchema.parse({ id: ID, saleId: SALE, amount: '12', reason: 'Parcial' })).toEqual({
      amount: 12,
      reason: 'Parcial',
    });
    expect(errorsOf(updateRefundSchema.safeParse({ amount: '-1' })).amount).toEqual(['El monto debe ser mayor a 0.']);
  });
});

describe('searchRefundSchema', () => {
  it('ignores unknown statuses and invalid ids, never throws', () => {
    expect(searchRefundSchema.parse({ q: '  REF  ', status: 'nope', saleId: 'x', limit: '500' })).toEqual({
      q: 'REF',
      status: undefined,
      saleId: undefined,
      clientId: undefined,
      limit: 20,
      offset: 0,
    });
    expect(searchRefundSchema.parse({ status: 'approved', saleId: SALE })).toMatchObject({ status: 'approved', saleId: SALE });
  });
});
