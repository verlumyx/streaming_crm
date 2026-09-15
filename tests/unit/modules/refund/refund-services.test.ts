import { beforeEach, describe, expect, it } from 'vitest';
import { RefundCreateService } from '@/modules/refund/services/refund-create.service';
import { RefundUpdateService } from '@/modules/refund/services/refund-update.service';
import { RefundApproveService } from '@/modules/refund/services/refund-approve.service';
import { RefundRejectService } from '@/modules/refund/services/refund-reject.service';
import { RefundFindService } from '@/modules/refund/services/refund-find.service';
import { CreateRefundCommand } from '@/modules/refund/commands/create-refund.command';
import { UpdateRefundCommand } from '@/modules/refund/commands/update-refund.command';
import { ResolveRefundCommand } from '@/modules/refund/commands/resolve-refund.command';
import { RefundSaleNotRefundableException } from '@/modules/refund/exceptions/refund-sale-not-refundable.exception';
import { RefundAlreadyResolvedException } from '@/modules/refund/exceptions/refund-already-resolved.exception';
import { RefundNotFoundException } from '@/modules/refund/exceptions/refund-not-found.exception';
import { FakeSaleRepository, FakeTransactionRepository } from '../sale/fake-sale.repository';
import { FakeRefundRepository } from './fake-refund.repository';

const COMPANY = 'company-1';
const OTHER_COMPANY = 'company-2';
const TODAY = '2026-09-14';

let refunds: FakeRefundRepository;
let sales: FakeSaleRepository;
let ledger: FakeTransactionRepository;

beforeEach(() => {
  refunds = new FakeRefundRepository();
  refunds.clients.push({ id: 'client-1', name: 'Camila', code: 'CLI000001' });
  sales = new FakeSaleRepository();
  ledger = new FakeTransactionRepository();
});

const create = (overrides: Partial<CreateRefundCommand> = {}) =>
  new RefundCreateService(refunds, sales).execute(
    Object.assign(new CreateRefundCommand('refund-1', COMPANY, 'sale-1', 30.5, 'Cliente insatisfecho', 'user-1'), overrides),
  );

describe('RefundCreateService', () => {
  it('creates a pending refund with the sale client as snapshot', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY, clientId: 'client-1' });

    const refund = await create();

    expect(refund).toMatchObject({
      code: 'REF000001',
      status: 'pending',
      clientId: 'client-1',
      amount: '30.50',
      reason: 'Cliente insatisfecho',
      requestedBy: 'user-1',
    });
    expect(ledger.created).toHaveLength(0);
  });

  it('accepts a cancelled sale', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY, status: 'cancelled' });
    await expect(create()).resolves.toMatchObject({ status: 'pending' });
  });

  it('rejects an expired sale, a sale of another company and an unknown sale', async () => {
    sales.addSale({ id: 'sale-expired', companyId: COMPANY, status: 'expired' });
    sales.addSale({ id: 'sale-other', companyId: OTHER_COMPANY });

    for (const saleId of ['sale-expired', 'sale-other', 'sale-missing']) {
      await expect(create({ saleId })).rejects.toBeInstanceOf(RefundSaleNotRefundableException);
    }
    expect(refunds.rows).toHaveLength(0);
  });
});

describe('RefundUpdateService', () => {
  it('updates amount and reason while pending (locking the row)', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY });
    await create();

    await new RefundUpdateService(refunds).execute('refund-1', COMPANY, new UpdateRefundCommand(12, null));

    expect(refunds.rows[0]).toMatchObject({ amount: '12.00', reason: null });
    expect(refunds.locks).toEqual(['refund-1']);
  });

  it('a resolved refund cannot be updated', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY });
    await create();
    refunds.rows[0].status = 'rejected';

    await expect(
      new RefundUpdateService(refunds).execute('refund-1', COMPANY, new UpdateRefundCommand(12, null)),
    ).rejects.toBeInstanceOf(RefundAlreadyResolvedException);
  });

  it('an unknown refund is not found', async () => {
    await expect(
      new RefundUpdateService(refunds).execute('missing', COMPANY, new UpdateRefundCommand(12, null)),
    ).rejects.toBeInstanceOf(RefundNotFoundException);
  });
});

describe('RefundApproveService', () => {
  const approve = (refundId = 'refund-1', companyId = COMPANY) =>
    new RefundApproveService(refunds, sales, ledger).execute(new ResolveRefundCommand(refundId, companyId, 'approver-1'), TODAY);

  it('cancels an active sale, records one expense and approves the refund', async () => {
    const sale = sales.addSale({ id: 'sale-1', companyId: COMPANY, clientId: 'client-1' });
    await create({ amount: 40 });

    await approve();

    expect(sale).toMatchObject({ status: 'cancelled', cancellationReason: 'Reembolso REF000001' });
    expect(ledger.created).toHaveLength(1);
    expect(ledger.created[0]).toMatchObject({
      companyId: COMPANY,
      category: 'refund',
      amount: 40,
      date: TODAY,
      description: `Reembolso venta ${sale.code} a Camila`,
      options: { type: 'expense', paymentMethod: 'cash', relatedType: 'Refund', relatedId: 'refund-1', recordedBy: 'approver-1' },
    });
    expect(refunds.rows[0]).toMatchObject({ status: 'approved', resolvedBy: 'approver-1' });
    expect(refunds.rows[0].resolvedAt).toBeInstanceOf(Date);
  });

  it('leaves an already cancelled sale alone and only records the expense', async () => {
    const cancelledAt = new Date('2026-09-01T10:00:00Z');
    const sale = sales.addSale({
      id: 'sale-1',
      companyId: COMPANY,
      status: 'cancelled',
      cancelledAt,
      cancellationReason: 'Falta de pago',
    });
    await create();

    await approve();

    expect(sale).toMatchObject({ status: 'cancelled', cancelledAt, cancellationReason: 'Falta de pago' });
    expect(ledger.created).toHaveLength(1);
  });

  it('a resolved refund cannot be approved again', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY });
    await create();
    await approve();

    await expect(approve()).rejects.toBeInstanceOf(RefundAlreadyResolvedException);
    expect(ledger.created).toHaveLength(1);
  });

  it('a refund of another company is not found', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY });
    await create();

    await expect(approve('refund-1', OTHER_COMPANY)).rejects.toBeInstanceOf(RefundNotFoundException);
    expect(ledger.created).toHaveLength(0);
  });
});

describe('RefundRejectService', () => {
  it('rejects without touching the sale nor the ledger', async () => {
    const sale = sales.addSale({ id: 'sale-1', companyId: COMPANY });
    await create();

    await new RefundRejectService(refunds).execute(new ResolveRefundCommand('refund-1', COMPANY, 'approver-1'));

    expect(refunds.rows[0]).toMatchObject({ status: 'rejected', resolvedBy: 'approver-1' });
    expect(sale.status).toBe('active');
    expect(ledger.created).toHaveLength(0);
  });

  it('a resolved refund cannot be rejected again', async () => {
    sales.addSale({ id: 'sale-1', companyId: COMPANY });
    await create();
    refunds.rows[0].status = 'approved';

    await expect(
      new RefundRejectService(refunds).execute(new ResolveRefundCommand('refund-1', COMPANY, null)),
    ).rejects.toBeInstanceOf(RefundAlreadyResolvedException);
  });
});

describe('RefundFindService', () => {
  it('throws when the refund does not exist', async () => {
    await expect(new RefundFindService(refunds, ledger).execute('missing', COMPANY)).rejects.toBeInstanceOf(
      RefundNotFoundException,
    );
  });
});
