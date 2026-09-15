import { describe, expect, it } from 'vitest';
import { createManualTransactionSchema } from '@/modules/manual-transaction/validation/create-manual-transaction.schema';
import { issuesToFieldErrors } from '@/modules/shared/validation/issues';

const base = {
  id: '0192f3a0-0000-7000-8000-000000000001',
  date: '2026-09-14',
  paymentMethod: 'cash',
  currency: 'usd',
  lines: JSON.stringify([{ category: 'sale', amount: '12.5', description: '' }]),
};

describe('createManualTransactionSchema', () => {
  it('parses lines from JSON, coerces amounts and normalizes optional text', () => {
    const parsed = createManualTransactionSchema.parse(base);
    expect(parsed.currency).toBe('USD');
    expect(parsed.lines).toEqual([{ category: 'sale', amount: 12.5, description: null }]);
    expect(parsed.reference).toBeNull();
  });

  it('keys nested errors by dotted path', () => {
    const result = createManualTransactionSchema.safeParse({
      ...base,
      date: 'not-a-date',
      lines: JSON.stringify([{ category: '', amount: '' }]),
    });
    expect(result.success).toBe(false);
    const errors = issuesToFieldErrors(result.error!);
    expect(errors.date?.[0]).toBe('La fecha no es válida.');
    expect(errors['lines.0.category']?.[0]).toBe('La categoría de la línea es obligatoria.');
    expect(errors['lines.0.amount']?.[0]).toBe('El monto de la línea es obligatorio.');
  });
});
