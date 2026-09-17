import { describe, expect, it } from 'vitest';
import { BotStaleSalesService, STALE_PENDING_REASON } from '@/modules/bot/services/bot-stale-sales.service';
import { SaleRejectService } from '@/modules/sale/services/sale-reject.service';
import { CreateSaleCommand } from '@/modules/sale/commands/create-sale.command';
import { SaleCreateService } from '@/modules/sale/services/sale-create.service';
import { uuidv7 } from '@/modules/shared/uuid';
import { FakeSaleRepository } from '../sale/fake-sale.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const BOT_USER = '0192f3a0-0000-7000-8000-00000000b001';
const HUMAN_USER = '0192f3a0-0000-7000-8000-00000000h001';
const SERVICE = '0192f3a0-0000-7000-8000-00000000s001';

function repositoryWithStock(): FakeSaleRepository {
  const repository = new FakeSaleRepository();
  repository.clients.push({ id: 'client-1', name: 'Camila', code: 'CLI000001', status: 'active' });
  repository.plans.push({
    id: 'plan-1',
    name: 'Netflix mensual',
    code: 'PLA000001',
    serviceId: SERVICE,
    serviceName: 'Netflix',
    maxProfiles: 4,
    capacity: 'profile',
    durationDays: 30,
    salePrice: '10.00',
  });
  repository.profiles.push(
    ...[1, 2].map((number) => ({
      id: `profile-${number}`,
      number,
      status: 'available' as const,
      accountId: 'account-1',
      accountEmail: 'cuenta@x.com',
      accountCompanyId: COMPANY,
      accountServiceId: SERVICE,
    })),
  );
  return repository;
}

const sell = (repository: FakeSaleRepository, agentId: string, profileId: string) =>
  new SaleCreateService(repository).execute(
    new CreateSaleCommand(uuidv7(), COMPANY, agentId, 'client-1', 'plan-1', '2026-09-17', [profileId], null),
  );

const service = (repository: FakeSaleRepository) =>
  new BotStaleSalesService(repository, new SaleRejectService(repository));

describe('BotStaleSalesService', () => {
  it('rejects the bot pending sales so their profiles go back on sale', async () => {
    const repository = repositoryWithStock();
    const [sale] = await sell(repository, BOT_USER, 'profile-1');

    const report = await service(repository).execute(0, [BOT_USER]);

    expect(report).toEqual({ rejected: 1 });
    expect(repository.sales.find((s) => s.id === sale.id)).toMatchObject({
      status: 'rejected',
      rejectionReason: STALE_PENDING_REASON,
    });
  });

  it('never touches a sale registered by a person', async () => {
    const repository = repositoryWithStock();
    await sell(repository, HUMAN_USER, 'profile-1');

    expect(await service(repository).execute(0, [BOT_USER])).toEqual({ rejected: 0 });
    expect(repository.sales.every((s) => s.status === 'pending')).toBe(true);
  });

  it('does nothing when no company has a bot', async () => {
    const repository = repositoryWithStock();
    await sell(repository, BOT_USER, 'profile-1');

    expect(await service(repository).execute(0, [])).toEqual({ rejected: 0 });
  });

  it('frees the reservation: the profile can be sold again afterwards', async () => {
    const repository = repositoryWithStock();
    await sell(repository, BOT_USER, 'profile-1');
    // While it is pending, the profile is committed.
    await expect(sell(repository, BOT_USER, 'profile-1')).rejects.toThrow();

    await service(repository).execute(0, [BOT_USER]);

    await expect(sell(repository, BOT_USER, 'profile-1')).resolves.toHaveLength(1);
  });
});
