import type { PlanRow } from '../models/plan.model';
import type { CreatePlanCommand } from '../commands/create-plan.command';
import type { SearchPlanCommand } from '../commands/search-plan.command';
import type { UpdatePlanCommand } from '../commands/update-plan.command';
import type { UpdateStatusPlanCommand } from '../commands/update-status-plan.command';

/** The service a plan is built on. */
export type PlanServiceRef = { id: string; code: string; name: string; logoUrl: string | null };

/** A plan row together with its service (every read of the module returns this). */
export type PlanRecord = PlanRow & { service: PlanServiceRef };

export interface PlanRepository {
  create(command: CreatePlanCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<PlanRecord | null>;
  findOrFail(id: string, companyId: string): Promise<PlanRecord>;
  update(row: PlanRow, command: UpdatePlanCommand): Promise<void>;
  updateStatus(row: PlanRow, command: UpdateStatusPlanCommand): Promise<void>;
  search(command: SearchPlanCommand): Promise<{ data: PlanRecord[]; total: number }>;

  /** Does the service exist inside the company (active or not)? */
  serviceExists(serviceId: string, companyId: string): Promise<boolean>;
}
