import type { PlanRow } from '@/modules/plan/models/plan.model';
import type { PlanRecord, PlanRepository, PlanServiceRef } from '@/modules/plan/repositories/plan.repository';
import type { CreatePlanCommand } from '@/modules/plan/commands/create-plan.command';
import type { SearchPlanCommand } from '@/modules/plan/commands/search-plan.command';
import type { UpdatePlanCommand } from '@/modules/plan/commands/update-plan.command';
import type { UpdateStatusPlanCommand } from '@/modules/plan/commands/update-status-plan.command';
import { PlanNotFoundException } from '@/modules/plan/exceptions/plan-not-found.exception';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';

type FakeService = PlanServiceRef & { companyId: string };

/** In-memory `PlanRepository` for service unit tests. Seed `services` with the catalogue first. */
export class FakePlanRepository implements PlanRepository {
  rows: PlanRow[] = [];
  services: FakeService[] = [];

  private withService(row: PlanRow): PlanRecord {
    const service = this.services.find((s) => s.id === row.serviceId);
    if (!service) throw new Error(`Fake service ${row.serviceId} not seeded`);
    return { ...row, service: { id: service.id, code: service.code, name: service.name, logoUrl: service.logoUrl } };
  }

  async create(command: CreatePlanCommand): Promise<void> {
    const sequence = this.rows.filter((r) => r.companyId === command.companyId).length + 1;
    this.rows.push({
      id: command.id,
      companyId: command.companyId,
      code: formatSequentialCode('PLA', sequence),
      serviceId: command.serviceId,
      name: command.name,
      capacity: command.capacity,
      durationDays: command.durationDays,
      salePrice: command.salePrice.toFixed(2),
      roiTargetPct: command.roiTargetPct.toFixed(2),
      active: true,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async findById(id: string, companyId: string) {
    const row = this.rows.find((r) => r.id === id && r.companyId === companyId);
    return row ? this.withService(row) : null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new PlanNotFoundException();
    return row;
  }

  async update(row: PlanRow, command: UpdatePlanCommand) {
    const target = this.rows.find((r) => r.id === row.id)!;
    Object.assign(target, {
      serviceId: command.serviceId,
      name: command.name,
      capacity: command.capacity,
      durationDays: command.durationDays,
      salePrice: command.salePrice.toFixed(2),
      roiTargetPct: command.roiTargetPct.toFixed(2),
    });
  }

  async updateStatus(row: PlanRow, command: UpdateStatusPlanCommand) {
    this.rows.find((r) => r.id === row.id)!.active = command.active;
  }

  async search(command: SearchPlanCommand) {
    const data = this.rows.filter((r) => r.companyId === command.companyId).map((r) => this.withService(r));
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async serviceExists(serviceId: string, companyId: string) {
    return this.services.some((s) => s.id === serviceId && s.companyId === companyId);
  }
}
