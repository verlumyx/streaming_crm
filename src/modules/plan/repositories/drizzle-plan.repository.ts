import { and, count, desc, eq, getTableColumns } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { plans, PLAN_CODE_PREFIX, type PlanRow } from '../models/plan.model';
import { services } from '@/modules/service/models/service.model';
import { PlanNotFoundException } from '../exceptions/plan-not-found.exception';
import { planFilters } from './plan.filters';
import type { PlanRecord, PlanRepository } from './plan.repository';
import type { CreatePlanCommand } from '../commands/create-plan.command';
import type { SearchPlanCommand } from '../commands/search-plan.command';
import type { UpdatePlanCommand } from '../commands/update-plan.command';
import type { UpdateStatusPlanCommand } from '../commands/update-status-plan.command';

const toNumeric = (value: number) => value.toFixed(2);

export class DrizzlePlanRepository implements PlanRepository {
  constructor(private readonly db: DbExecutor) {}

  /** `app_plans.*` + its service, joined. */
  private selectWithService() {
    return this.db
      .select({
        ...getTableColumns(plans),
        service: { id: services.id, code: services.code, name: services.name, logoUrl: services.logoUrl },
      })
      .from(plans)
      .innerJoin(services, eq(services.id, plans.serviceId));
  }

  async create(command: CreatePlanCommand): Promise<void> {
    await lockCompanySequence(this.db, command.companyId, PLAN_CODE_PREFIX);
    const code = await generateNextCode(this.db, plans, command.companyId, PLAN_CODE_PREFIX);

    await this.db.insert(plans).values({
      id: command.id,
      companyId: command.companyId,
      code,
      serviceId: command.serviceId,
      name: command.name,
      capacity: command.capacity,
      durationDays: command.durationDays,
      salePrice: toNumeric(command.salePrice),
      roiTargetPct: toNumeric(command.roiTargetPct),
      active: true,
    });
  }

  async findById(id: string, companyId: string): Promise<PlanRecord | null> {
    const [row] = await this.selectWithService()
      .where(and(eq(plans.id, id), eq(plans.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<PlanRecord> {
    const row = await this.findById(id, companyId);
    if (!row) throw new PlanNotFoundException();
    return row;
  }

  async update(row: PlanRow, command: UpdatePlanCommand): Promise<void> {
    await this.db
      .update(plans)
      .set({
        serviceId: command.serviceId,
        name: command.name,
        capacity: command.capacity,
        durationDays: command.durationDays,
        salePrice: toNumeric(command.salePrice),
        roiTargetPct: toNumeric(command.roiTargetPct),
      })
      .where(eq(plans.id, row.id));
  }

  async updateStatus(row: PlanRow, command: UpdateStatusPlanCommand): Promise<void> {
    await this.db.update(plans).set({ active: command.active }).where(eq(plans.id, row.id));
  }

  async search(command: SearchPlanCommand): Promise<{ data: PlanRecord[]; total: number }> {
    const where = and(eq(plans.companyId, command.companyId), ...applyFilters(planFilters, command.filters));

    const [{ total }] = await this.db.select({ total: count() }).from(plans).where(where);
    const data = await this.selectWithService()
      .where(where)
      .orderBy(desc(plans.createdAt), desc(plans.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }

  async serviceExists(serviceId: string, companyId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.companyId, companyId)))
      .limit(1);
    return Boolean(row);
  }
}
