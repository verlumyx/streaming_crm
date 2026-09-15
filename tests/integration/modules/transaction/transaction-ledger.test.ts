import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { createTransactionContainer } from '@/modules/transaction/container';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import { SearchTransactionCommand } from '@/modules/transaction/commands/search-transaction.command';
import { transactionCatalog, typeForCategory } from '@/modules/transaction/models/transaction.model';
import { resetDb } from '../../../helpers/reset-db';
import { createCompany } from '../../../factories/company.factory';

const record = (companyId: string, category: Parameters<typeof typeForCategory>[0], amount: number, date: string, extra = {}) =>
  createTransactionContainer(db).recordService.execute(
    new CreateTransactionCommand(uuidv7(), companyId, category as never, amount, date, `Mov ${category}`, extra),
  );

describe('Transaction ledger', () => {
  beforeEach(resetDb);

  it('derives the type from the category and stores positive amounts', async () => {
    const company = await createCompany(db);
    await record(company.id, 'sale', 10, '2026-09-01', { relatedType: 'Sale', relatedId: uuidv7() });
    await record(company.id, 'streaming_account', 4.5, '2026-09-02');

    const { data } = await createTransactionContainer(db).searchService.execute(
      new SearchTransactionCommand({ companyId: company.id }),
    );

    expect(data.map((t) => [t.category, t.type, t.amount])).toEqual([
      ['streaming_account', 'expense', '4.50'],
      ['sale', 'income', '10.00'],
    ]);
    expect(data[1]).toMatchObject({ paymentMethod: 'cash', currency: 'USD' });
  });

  it('rejects negative amounts', async () => {
    const company = await createCompany(db);
    await expect(record(company.id, 'sale', -1, '2026-09-01')).rejects.toThrow('mayor o igual a 0');
  });

  it('summarizes income, expense and counts within a date range', async () => {
    const company = await createCompany(db);
    await record(company.id, 'sale', 10, '2026-09-01');
    await record(company.id, 'renewal', 5, '2026-09-10');
    await record(company.id, 'refund', 3, '2026-09-15');
    await record(company.id, 'sale', 100, '2026-08-31');

    const summary = await createTransactionContainer(db).summaryService.execute(company.id, {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });

    expect(summary).toEqual({ totalIncome: 15, totalExpense: 3, incomeCount: 2, expenseCount: 1, balance: 12 });
  });

  it('filters by type, category and related record and isolates companies', async () => {
    const company = await createCompany(db);
    const other = await createCompany(db);
    const saleId = uuidv7();
    await record(company.id, 'sale', 10, '2026-09-01', { relatedType: 'Sale', relatedId: saleId });
    await record(company.id, 'marketing', 2, '2026-09-01');
    await record(other.id, 'sale', 99, '2026-09-01');

    const { searchService, repository } = createTransactionContainer(db);
    const byType = await searchService.execute(new SearchTransactionCommand({ companyId: company.id, filters: { type: 'expense' } }));
    const byCategory = await searchService.execute(new SearchTransactionCommand({ companyId: company.id, filters: { category: 'sale' } }));

    expect(byType.data.map((t) => t.category)).toEqual(['marketing']);
    expect(byCategory.total).toBe(1);
    expect(await repository.findRelated(company.id, 'Sale', saleId)).toHaveLength(1);
    expect(await repository.findRelated(other.id, 'Sale', saleId)).toHaveLength(0);
  });

  it('exposes a catalog with Spanish labels grouped by type', () => {
    const catalog = transactionCatalog();
    expect(catalog.income.map((c) => c.value)).toEqual(['sale', 'renewal', 'partner_contribution', 'other_income']);
    expect(catalog.expense.find((c) => c.value === 'refund')).toMatchObject({ label: 'Reembolso', type: 'expense' });
    expect(() => typeForCategory('nope')).toThrow();
  });
});
