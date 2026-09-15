import { beforeEach, describe, expect, it } from 'vitest';
import { SaleCreateService } from '@/modules/sale/services/sale-create.service';
import { SaleRenewService } from '@/modules/sale/services/sale-renew.service';
import { SaleReactivateService } from '@/modules/sale/services/sale-reactivate.service';
import { SaleCancelService } from '@/modules/sale/services/sale-cancel.service';
import { SalesExpireService, type SaleTransactionRunner } from '@/modules/sale/services/sales-expire.service';
import { CreateSaleCommand } from '@/modules/sale/commands/create-sale.command';
import { RenewSaleCommand } from '@/modules/sale/commands/renew-sale.command';
import { ReactivateSaleCommand } from '@/modules/sale/commands/reactivate-sale.command';
import { CancelSaleCommand } from '@/modules/sale/commands/cancel-sale.command';
import { SaleClientInactiveException } from '@/modules/sale/exceptions/sale-client-inactive.exception';
import { SalePlanNotFoundException } from '@/modules/sale/exceptions/sale-plan-not-found.exception';
import { SaleProfilesUnavailableException } from '@/modules/sale/exceptions/sale-profiles-unavailable.exception';
import { SaleCannotBeRenewedException } from '@/modules/sale/exceptions/sale-cannot-be-renewed.exception';
import { SaleCannotBeReactivatedException } from '@/modules/sale/exceptions/sale-cannot-be-reactivated.exception';
import { SaleAlreadyCancelledException } from '@/modules/sale/exceptions/sale-already-cancelled.exception';
import { SaleNotFoundException } from '@/modules/sale/exceptions/sale-not-found.exception';
import { FakePendingRefundWriter, FakeSaleRepository, FakeTransactionRepository } from './fake-sale.repository';

const COMPANY = 'company-1';
const TODAY = '2026-09-14';
const GRACE = 3;

function seed(repository: FakeSaleRepository) {
  repository.clients.push(
    { id: 'client-1', name: 'Camila', code: 'CLI000001', status: 'active' },
    { id: 'client-2', name: 'Inactiva', code: 'CLI000002', status: 'inactive' },
  );
  repository.plans.push({
    id: 'plan-1',
    name: 'Netflix perfil',
    code: 'PLA000001',
    serviceId: 'service-1',
    serviceName: 'Netflix',
    maxProfiles: 2,
    capacity: 'profile',
    durationDays: 30,
    salePrice: '12.50',
  });
  repository.services.push({ id: 'service-1', name: 'Netflix', code: 'SER000001', maxProfiles: 2 });
  for (const n of [1, 2, 3]) {
    repository.profiles.push({
      id: `profile-${n}`,
      number: n,
      status: 'available',
      accountId: 'account-1',
      accountEmail: 'cuenta@x.com',
      accountCompanyId: COMPANY,
      accountServiceId: 'service-1',
    });
  }
}

const createCommand = (overrides: Partial<CreateSaleCommand> = {}) =>
  Object.assign(
    new CreateSaleCommand('sale-new', COMPANY, 'agent-1', 'client-1', 'plan-1', '2026-09-10', ['profile-1'], null),
    overrides,
  );

describe('SaleCreateService', () => {
  let repository: FakeSaleRepository;
  let ledger: FakeTransactionRepository;
  let service: SaleCreateService;

  beforeEach(() => {
    repository = new FakeSaleRepository();
    ledger = new FakeTransactionRepository();
    seed(repository);
    service = new SaleCreateService(repository, ledger);
  });

  it('snapshots the plan, computes the end date, occupies the profile and records the sale income', async () => {
    const sale = await service.execute(createCommand());

    expect(sale).toMatchObject({
      code: 'SAL000001',
      serviceId: 'service-1',
      capacity: 'profile',
      durationDays: 30,
      price: '12.50',
      endDate: '2026-10-10',
      status: 'active',
      agentId: 'agent-1',
    });
    expect(repository.profile('profile-1').status).toBe('occupied');
    expect(ledger.created).toHaveLength(1);
    expect(ledger.created[0]).toMatchObject({
      category: 'sale',
      amount: 12.5,
      date: '2026-09-10',
      description: 'Venta Netflix a Camila',
      options: { relatedType: 'Sale', relatedId: 'sale-new', periodFrom: '2026-09-10', periodTo: '2026-10-10', recordedBy: 'agent-1' },
    });
  });

  it('rejects inactive clients and unknown plans before touching profiles', async () => {
    await expect(service.execute(createCommand({ clientId: 'client-2' }))).rejects.toBeInstanceOf(
      SaleClientInactiveException,
    );
    await expect(service.execute(createCommand({ planId: 'nope' }))).rejects.toBeInstanceOf(SalePlanNotFoundException);
    expect(repository.sales).toHaveLength(0);
  });

  it('throws a conflict with the unavailable profiles and writes nothing', async () => {
    repository.profile('profile-1').status = 'occupied';

    const error = await service.execute(createCommand()).catch((e) => e);

    expect(error).toBeInstanceOf(SaleProfilesUnavailableException);
    expect(error.details).toEqual({ unavailableProfiles: [{ id: 'profile-1', label: 'cuenta@x.com · Perfil 1' }] });
    expect(repository.sales).toHaveLength(0);
    expect(ledger.created).toHaveLength(0);
  });
});

describe('SaleRenewService', () => {
  it('defaults to the sale snapshot and extends from the current end date', async () => {
    const repository = new FakeSaleRepository();
    const ledger = new FakeTransactionRepository();
    const sale = repository.addSale({ id: 'sale-1', companyId: COMPANY, endDate: '2026-09-20', price: '9.00' });

    await new SaleRenewService(repository, ledger, GRACE).execute(
      'sale-1',
      COMPANY,
      new RenewSaleCommand('renewal-1', 'user-1', null, null, null),
      TODAY,
    );

    expect(sale).toMatchObject({ endDate: '2026-10-20', status: 'active' });
    expect(repository.renewals[0]).toMatchObject({
      renewedAt: TODAY,
      previousEndDate: '2026-09-20',
      newEndDate: '2026-10-20',
      durationDays: 30,
      price: 9,
    });
    expect(ledger.created[0]).toMatchObject({
      category: 'renewal',
      amount: 9,
      date: TODAY,
      description: `Renovación de venta ${sale.code}`,
      options: { periodFrom: TODAY, periodTo: '2026-10-20', recordedBy: 'user-1' },
    });
  });

  it('blocks expired sales beyond grace and unknown sales', async () => {
    const repository = new FakeSaleRepository();
    repository.addSale({ id: 'sale-1', companyId: COMPANY, status: 'expired', endDate: '2026-09-10' });
    const service = new SaleRenewService(repository, new FakeTransactionRepository(), GRACE);
    const command = new RenewSaleCommand('renewal-1', null, null, null, null);

    await expect(service.execute('sale-1', COMPANY, command, TODAY)).rejects.toBeInstanceOf(SaleCannotBeRenewedException);
    await expect(service.execute('sale-1', 'other', command, TODAY)).rejects.toBeInstanceOf(SaleNotFoundException);
    await expect(service.execute('sale-1', COMPANY, command, '2026-09-13')).resolves.toMatchObject({ status: 'active' });
  });
});

describe('SaleReactivateService', () => {
  it('restarts the cycle at today + duration, reuses free profiles and clears the cancellation', async () => {
    const repository = new FakeSaleRepository();
    seed(repository);
    const ledger = new FakeTransactionRepository();
    const sale = repository.addSale(
      { id: 'sale-1', companyId: COMPANY, status: 'cancelled', cancellationReason: 'x', endDate: '2026-09-30' },
      ['profile-1'],
    );

    await new SaleReactivateService(repository, ledger, GRACE).execute(
      'sale-1',
      COMPANY,
      new ReactivateSaleCommand('renewal-1', 'user-1', 45, 20, [], null),
      TODAY,
    );

    expect(sale).toMatchObject({ status: 'active', endDate: '2026-10-29', price: '20.00', durationDays: 45, cancellationReason: null });
    expect(repository.profile('profile-1').status).toBe('occupied');
    expect(ledger.created[0]).toMatchObject({ category: 'renewal', amount: 20, description: `Reactivación de venta ${sale.code}` });
  });

  it('conflicts when a newer sale holds the profile and accepts replacements of the same service', async () => {
    const repository = new FakeSaleRepository();
    seed(repository);
    const service = new SaleReactivateService(repository, new FakeTransactionRepository(), GRACE);
    repository.addSale({ id: 'sale-1', companyId: COMPANY, status: 'cancelled' }, ['profile-1']);
    repository.addSale({ id: 'sale-2', companyId: COMPANY, status: 'active' }, ['profile-1']);
    repository.profile('profile-1').status = 'occupied';

    await expect(
      service.execute('sale-1', COMPANY, new ReactivateSaleCommand('r1', null, null, null, [], null), TODAY),
    ).rejects.toBeInstanceOf(SaleProfilesUnavailableException);

    await service.execute('sale-1', COMPANY, new ReactivateSaleCommand('r2', null, null, null, ['profile-2'], null), TODAY);
    expect(await repository.profileIdsOf('sale-1')).toEqual(['profile-2']);
    expect(repository.profile('profile-1').status).toBe('occupied');
  });

  it('blocks sales that only need a renewal', async () => {
    const repository = new FakeSaleRepository();
    repository.addSale({ id: 'sale-1', companyId: COMPANY, status: 'active' });
    const service = new SaleReactivateService(repository, new FakeTransactionRepository(), GRACE);

    await expect(
      service.execute('sale-1', COMPANY, new ReactivateSaleCommand('r1', null, null, null, [], null), TODAY),
    ).rejects.toBeInstanceOf(SaleCannotBeReactivatedException);
  });
});

describe('SaleCancelService', () => {
  it('frees profiles and requests a pending refund defaulting to price and cancellation reason', async () => {
    const repository = new FakeSaleRepository();
    seed(repository);
    const refunds = new FakePendingRefundWriter();
    repository.addSale({ id: 'sale-1', companyId: COMPANY, price: '15.00' }, ['profile-1']);
    repository.profile('profile-1').status = 'occupied';

    const sale = await new SaleCancelService(repository, refunds).execute(
      'sale-1',
      COMPANY,
      new CancelSaleCommand('user-1', 'Falta de pago', true, null, null),
    );

    expect(sale).toMatchObject({ status: 'cancelled', cancellationReason: 'Falta de pago' });
    expect(repository.profile('profile-1').status).toBe('available');
    expect(refunds.created).toEqual([
      expect.objectContaining({ saleId: 'sale-1', clientId: 'client-1', amount: 15, reason: 'Falta de pago', requestedBy: 'user-1' }),
    ]);
  });

  it('does not request a refund unless asked and never cancels twice', async () => {
    const repository = new FakeSaleRepository();
    const refunds = new FakePendingRefundWriter();
    repository.addSale({ id: 'sale-1', companyId: COMPANY });
    const service = new SaleCancelService(repository, refunds);

    await service.execute('sale-1', COMPANY, new CancelSaleCommand(null, 'x', false, null, null));
    expect(refunds.created).toHaveLength(0);
    await expect(
      service.execute('sale-1', COMPANY, new CancelSaleCommand(null, 'x', false, null, null)),
    ).rejects.toBeInstanceOf(SaleAlreadyCancelledException);
  });
});

describe('SalesExpireService', () => {
  it('expires due sales and frees profiles beyond grace, one unit of work per sale', async () => {
    const repository = new FakeSaleRepository();
    seed(repository);
    let units = 0;
    const runner: SaleTransactionRunner = (work) => {
      units++;
      return work(repository);
    };
    repository.addSale({ id: 'due', companyId: COMPANY, endDate: '2026-09-13' }, ['profile-1']);
    repository.addSale({ id: 'fresh', companyId: COMPANY, endDate: TODAY });
    repository.addSale({ id: 'beyond', companyId: COMPANY, status: 'expired', endDate: '2026-09-10' }, ['profile-2']);
    repository.addSale({ id: 'grace', companyId: COMPANY, status: 'expired', endDate: '2026-09-11' }, ['profile-3']);
    for (const id of ['profile-1', 'profile-2', 'profile-3']) repository.profile(id).status = 'occupied';

    const result = await new SalesExpireService(repository, runner, GRACE).execute(TODAY);

    expect(result).toEqual({ expired: 1, released: 1 });
    expect(units).toBe(2);
    expect(repository.sales.map((s) => [s.id, s.status])).toEqual([
      ['due', 'expired'],
      ['fresh', 'active'],
      ['beyond', 'expired'],
      ['grace', 'expired'],
    ]);
    expect(repository.profiles.map((p) => p.status)).toEqual(['occupied', 'available', 'occupied']);
  });
});
