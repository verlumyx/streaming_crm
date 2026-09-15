import { describe, expect, it } from 'vitest';
import { PlanCreateService } from '@/modules/plan/services/plan-create.service';
import { PlanFindService } from '@/modules/plan/services/plan-find.service';
import { PlanSearchService } from '@/modules/plan/services/plan-search.service';
import { PlanUpdateService } from '@/modules/plan/services/plan-update.service';
import { PlanUpdateStatusService } from '@/modules/plan/services/plan-update-status.service';
import { CreatePlanCommand } from '@/modules/plan/commands/create-plan.command';
import { SearchPlanCommand } from '@/modules/plan/commands/search-plan.command';
import { UpdatePlanCommand } from '@/modules/plan/commands/update-plan.command';
import { UpdateStatusPlanCommand } from '@/modules/plan/commands/update-status-plan.command';
import { PlanInvalidServiceException } from '@/modules/plan/exceptions/plan-invalid-service.exception';
import { PlanNotFoundException } from '@/modules/plan/exceptions/plan-not-found.exception';
import { toPlanDto } from '@/modules/plan/serializers/plan.serializer';
import { FakePlanRepository } from './fake-plan.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';
const SERVICE = '0192f3a0-0000-7000-8000-00000000a001';
const SERVICE_2 = '0192f3a0-0000-7000-8000-00000000a002';
const FOREIGN_SERVICE = '0192f3a0-0000-7000-8000-00000000a003';
const ID_1 = '0192f3a0-0000-7000-8000-000000000001';
const ID_2 = '0192f3a0-0000-7000-8000-000000000002';

function seeded() {
  const repository = new FakePlanRepository();
  repository.services.push(
    { id: SERVICE, companyId: COMPANY, code: 'SER000001', name: 'Netflix', logoUrl: null },
    { id: SERVICE_2, companyId: COMPANY, code: 'SER000002', name: 'Disney+', logoUrl: null },
    { id: FOREIGN_SERVICE, companyId: OTHER_COMPANY, code: 'SER000001', name: 'Max', logoUrl: null },
  );
  return repository;
}

const newPlan = (id: string, serviceId = SERVICE, companyId = COMPANY) =>
  new CreatePlanCommand(id, companyId, serviceId, 'Netflix Mensual', 'profile', 30, 12.5, 40);

const changes = (serviceId = SERVICE_2) => new UpdatePlanCommand(serviceId, 'Disney Trimestral', 'full_account', 90, 30, 55.25);

describe('PlanCreateService', () => {
  it('creates an active plan with its service', async () => {
    const repository = seeded();

    const plan = await new PlanCreateService(repository).execute(newPlan(ID_1));

    expect(plan).toMatchObject({
      id: ID_1,
      code: 'PLA000001',
      active: true,
      salePrice: '12.50',
      service: { id: SERVICE, name: 'Netflix' },
    });
  });

  it('rejects a service from another company', async () => {
    const repository = seeded();

    await expect(new PlanCreateService(repository).execute(newPlan(ID_1, FOREIGN_SERVICE))).rejects.toBeInstanceOf(
      PlanInvalidServiceException,
    );
    expect(repository.rows).toHaveLength(0);
  });

  it('allows several plans with the same name', async () => {
    const repository = seeded();
    const service = new PlanCreateService(repository);

    await service.execute(newPlan(ID_1));
    await expect(service.execute(newPlan(ID_2))).resolves.toMatchObject({ code: 'PLA000002' });
  });
});

describe('PlanUpdateService', () => {
  it('updates every commercial field, including the service', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));

    const plan = await new PlanUpdateService(repository).execute(ID_1, COMPANY, changes());

    expect(plan).toMatchObject({
      name: 'Disney Trimestral',
      capacity: 'full_account',
      durationDays: 90,
      salePrice: '30.00',
      roiTargetPct: '55.25',
      service: { id: SERVICE_2, name: 'Disney+' },
    });
  });

  it('rejects moving the plan to a service of another company', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));

    await expect(
      new PlanUpdateService(repository).execute(ID_1, COMPANY, changes(FOREIGN_SERVICE)),
    ).rejects.toBeInstanceOf(PlanInvalidServiceException);
    expect(repository.rows[0].serviceId).toBe(SERVICE);
  });

  it('throws when the plan is missing or belongs to another company', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));
    const service = new PlanUpdateService(repository);

    await expect(service.execute(ID_2, COMPANY, changes())).rejects.toBeInstanceOf(PlanNotFoundException);
    await expect(service.execute(ID_1, OTHER_COMPANY, changes(FOREIGN_SERVICE))).rejects.toBeInstanceOf(
      PlanNotFoundException,
    );
  });
});

describe('PlanUpdateStatusService / PlanFindService / PlanSearchService', () => {
  it('toggles the active flag', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));
    const service = new PlanUpdateStatusService(repository);

    await expect(service.execute(ID_1, COMPANY, new UpdateStatusPlanCommand(false))).resolves.toMatchObject({
      active: false,
    });
    await expect(service.execute(ID_1, COMPANY, new UpdateStatusPlanCommand(true))).resolves.toMatchObject({
      active: true,
    });
    await expect(service.execute(ID_2, COMPANY, new UpdateStatusPlanCommand(true))).rejects.toBeInstanceOf(
      PlanNotFoundException,
    );
  });

  it('finds a plan of the company only', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));
    const service = new PlanFindService(repository);

    await expect(service.execute(ID_1, COMPANY)).resolves.toMatchObject({ id: ID_1 });
    await expect(service.execute(ID_1, OTHER_COMPANY)).rejects.toBeInstanceOf(PlanNotFoundException);
  });

  it('delegates the search to the repository', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));
    await repository.create(newPlan(ID_2, FOREIGN_SERVICE, OTHER_COMPANY));

    const result = await new PlanSearchService(repository).execute(new SearchPlanCommand({ companyId: COMPANY }));

    expect(result.total).toBe(1);
    expect(result.data.map((p) => p.id)).toEqual([ID_1]);
  });

  it('serializes numeric columns as numbers', async () => {
    const repository = seeded();
    await repository.create(newPlan(ID_1));

    const dto = toPlanDto(await repository.findOrFail(ID_1, COMPANY));

    expect(dto).toMatchObject({ salePrice: 12.5, roiTargetPct: 40, durationDays: 30, createdAt: expect.any(String) });
  });
});
