import { beforeEach, describe, expect, it } from 'vitest';
import { asc, count, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { initialActionState } from '@/modules/shared/actions/action-state';
import {
  manualTransactionLines,
  manualTransactions,
} from '@/modules/manual-transaction/models/manual-transaction.model';
import {
  transactionCatalog,
  transactions,
  typeForCategory,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '@/modules/transaction/models/transaction.model';
import {
  approveManualTransactionAction,
  cancelManualTransactionAction,
  createManualTransactionAction,
} from '@/app/[companyId]/manual-transactions/actions';
import ManualTransactionsPage from '@/app/[companyId]/manual-transactions/page';
import ManualTransactionShowPage from '@/app/[companyId]/manual-transactions/[id]/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect, expectNotFound } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createManualTransaction } from '../../../factories/manual-transaction.factory';

const payload = (overrides: Record<string, unknown> = {}) => ({
  id: uuidv7(),
  date: '2026-09-14',
  paymentMethod: 'cash',
  currency: 'USD',
  reference: 'REF-001',
  description: 'Cierre de caja',
  lines: [
    { category: 'partner_contribution', amount: 100, description: 'Aporte' },
    { category: 'salary', amount: 40, description: 'Pago' },
  ],
  ...overrides,
});

const submit = (companyId: string, values: Record<string, unknown>) =>
  createManualTransactionAction(
    companyId,
    initialActionState,
    formData({ ...values, lines: JSON.stringify(values.lines) } as Record<string, string>),
  );

const ledgerCount = async () => (await db.select({ n: count() }).from(transactions))[0].n;

describe('Catálogo de transacciones', () => {
  it('exposes 2 types, 14 categories and the income/expense groups', () => {
    const catalog = transactionCatalog();
    expect(catalog.types).toHaveLength(2);
    expect(catalog.categories).toHaveLength(14);
    expect(catalog.income).toHaveLength(INCOME_CATEGORIES.length);
    expect(catalog.expense).toHaveLength(EXPENSE_CATEGORIES.length);
  });

  it('every catalog category type matches typeForCategory', () => {
    for (const category of transactionCatalog().categories) {
      expect(category.type).toBe(typeForCategory(category.value));
    }
  });
});

describe('Crear transacción manual', () => {
  beforeEach(resetDb);

  it('is created with header and lines, deriving the type', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const values = payload();

    await expectRedirect(submit(company.id, values), `/${company.id}/manual-transactions/${values.id}`);

    const [header] = await db.select().from(manualTransactions).where(eq(manualTransactions.id, values.id as string));
    expect(header).toMatchObject({ code: 'MTX000001', total: '140.00', status: 'pending', recordedBy: user.id, reference: 'REF-001' });

    const lines = await db
      .select()
      .from(manualTransactionLines)
      .where(eq(manualTransactionLines.manualTransactionId, values.id as string))
      .orderBy(asc(manualTransactionLines.id));
    expect(lines.map((l) => [l.category, l.type, l.amount])).toEqual([
      ['partner_contribution', 'income', '100.00'],
      ['salary', 'expense', '40.00'],
    ]);
  });

  it('never writes to the ledger', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectRedirect(submit(company.id, payload()), `/${company.id}/manual-transactions/`);

    expect(await ledgerCount()).toBe(0);
  });

  it('codes are sequential per company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectRedirect(submit(company.id, payload()), `/${company.id}/manual-transactions/`);
    await expectRedirect(submit(company.id, payload()), `/${company.id}/manual-transactions/`);

    const codes = (await db.select({ code: manualTransactions.code }).from(manualTransactions).orderBy(asc(manualTransactions.code))).map((r) => r.code);
    expect(codes).toEqual(['MTX000001', 'MTX000002']);
  });

  it('rejects a manual transaction without lines', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await submit(company.id, payload({ lines: [] }));

    expect(result.fieldErrors?.lines?.[0]).toBe('Debe registrar al menos una línea.');
  });

  it('rejects a line with an invalid category', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await submit(company.id, payload({ lines: [{ category: 'not_a_category', amount: 10 }] }));

    expect(result.fieldErrors?.['lines.0.category']?.[0]).toBe('La categoría de la línea no es válida.');
  });

  it('rejects a line with a negative amount', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await submit(company.id, payload({ lines: [{ category: 'salary', amount: -5 }] }));

    expect(result.fieldErrors?.['lines.0.amount']?.[0]).toBe('El monto de la línea no puede ser negativo.');
    expect(await db.select().from(manualTransactions)).toHaveLength(0);
  });

  it('creating requires the manual-transactions.create permission', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['manual-transactions.list']);
    setSessionUser(user);

    const result = await submit(company.id, payload());

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
  });
});

describe('Aprobar / cancelar transacción manual', () => {
  beforeEach(resetDb);

  it('approving writes one ledger transaction per line', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: company.id });
    setSessionUser(user);

    await expectRedirect(approveManualTransactionAction(company.id, manual.id), `/${company.id}/manual-transactions/${manual.id}`);

    const [header] = await db.select().from(manualTransactions).where(eq(manualTransactions.id, manual.id));
    expect(header.status).toBe('approved');
    expect(header.approvedAt).not.toBeNull();

    const ledger = await db.select().from(transactions).where(eq(transactions.relatedId, manual.id)).orderBy(asc(transactions.amount));
    expect(ledger.map((t) => [t.type, t.category, t.amount, t.relatedType, t.recordedBy])).toEqual([
      ['expense', 'salary', '40.00', 'ManualTransaction', user.id],
      ['income', 'partner_contribution', '100.00', 'ManualTransaction', user.id],
    ]);
    expect(ledger[0].description).toBe(`Transacción manual ${manual.code}`);
  });

  it('concurrent approvals never duplicate ledger entries', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: company.id });
    setSessionUser(user);

    await Promise.allSettled([
      approveManualTransactionAction(company.id, manual.id),
      approveManualTransactionAction(company.id, manual.id),
    ]);

    expect(await ledgerCount()).toBe(2);
  });

  it('cancelling does not touch the ledger', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: company.id });
    setSessionUser(user);

    await expectRedirect(cancelManualTransactionAction(company.id, manual.id), `/${company.id}/manual-transactions/${manual.id}`);

    const [header] = await db.select().from(manualTransactions).where(eq(manualTransactions.id, manual.id));
    expect(header.status).toBe('cancelled');
    expect(header.cancelledAt).not.toBeNull();
    expect(await ledgerCount()).toBe(0);
  });

  it('an approved manual transaction cannot be approved or cancelled again', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: company.id });
    setSessionUser(user);
    await expectRedirect(approveManualTransactionAction(company.id, manual.id), `/${company.id}/manual-transactions/`);

    const message = 'La transacción manual ya fue resuelta y no puede modificarse.';
    expect(await cancelManualTransactionAction(company.id, manual.id)).toMatchObject({ status: 'error', message });
    expect(await approveManualTransactionAction(company.id, manual.id)).toMatchObject({ status: 'error', message });
    expect(await ledgerCount()).toBe(2);
  });

  it('a cancelled manual transaction cannot be approved', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: company.id });
    setSessionUser(user);
    await expectRedirect(cancelManualTransactionAction(company.id, manual.id), `/${company.id}/manual-transactions/`);

    expect((await approveManualTransactionAction(company.id, manual.id)).status).toBe('error');
    expect(await ledgerCount()).toBe(0);
  });

  it('approving and cancelling require their permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['manual-transactions.show']);
    const manual = await createManualTransaction(db, { companyId: company.id });
    setSessionUser(user);

    expect((await approveManualTransactionAction(company.id, manual.id)).status).toBe('error');
    expect((await cancelManualTransactionAction(company.id, manual.id)).status).toBe('error');
    const [header] = await db.select().from(manualTransactions).where(eq(manualTransactions.id, manual.id));
    expect(header.status).toBe('pending');
  });
});

describe('Listar / ver transacciones manuales', () => {
  beforeEach(resetDb);

  it('the index page renders the manual transactions list', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createManualTransaction(db, { companyId: company.id, date: '2026-09-01' });
    await createManualTransaction(db, { companyId: company.id, date: '2026-09-10' });
    setSessionUser(user);

    const element = await ManualTransactionsPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({}),
    });

    expect(element.props.manualTransactions).toHaveLength(2);
    expect(element.props.manualTransactions[0]).toMatchObject({ date: '2026-09-10', lineCount: 2, total: 140 });
    expect(element.props.meta.total).toBe(2);
  });

  it('filters by code and date range', async () => {
    const { user, company } = await createUserWithCompany(db);
    const early = await createManualTransaction(db, { companyId: company.id, date: '2026-08-01' });
    await createManualTransaction(db, { companyId: company.id, date: '2026-09-10' });
    setSessionUser(user);

    const byDate = await ManualTransactionsPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({ dateFrom: '2026-09-01', dateTo: '2026-09-30' }),
    });
    const byCode = await ManualTransactionsPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({ code: early.code.slice(-3) }),
    });

    expect(byDate.props.meta.total).toBe(1);
    expect(byCode.props.manualTransactions.map((m: { id: string }) => m.id)).toEqual([early.id]);
  });

  it('the show page renders the header with its lines', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, {
      companyId: company.id,
      lines: [
        { category: 'sale', amount: 1 },
        { category: 'tools', amount: 2 },
        { category: 'marketing', amount: 3 },
      ],
    });
    setSessionUser(user);

    const element = await ManualTransactionShowPage({ params: Promise.resolve({ companyId: company.id, id: manual.id }) });

    expect(element.props.manualTransaction).toMatchObject({ id: manual.id, total: 6, canBeApproved: true });
    expect(element.props.manualTransaction.lines).toHaveLength(3);
  });

  it('a manual transaction is scoped to its company', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: a.company.id });
    setSessionUser(b.user);

    await expectNotFound(ManualTransactionShowPage({ params: Promise.resolve({ companyId: b.company.id, id: manual.id }) }));
  });

  it('listing and viewing require their permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    const manual = await createManualTransaction(db, { companyId: company.id });
    await assignRoleWithPermissions(db, user.id, company.id, []);
    setSessionUser(user);

    await expectRedirect(
      ManualTransactionsPage({ params: Promise.resolve({ companyId: company.id }), searchParams: Promise.resolve({}) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
    await expectRedirect(
      ManualTransactionShowPage({ params: Promise.resolve({ companyId: company.id, id: manual.id }) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
  });
});
