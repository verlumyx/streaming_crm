import type { SearchPlanInput } from '../validation/search-plan.schema';

/** Keys MUST match `planFilters`. */
export type PlanSearchFilters = Partial<Pick<SearchPlanInput, 'name' | 'code' | 'capacity' | 'serviceId' | 'active'>>;

export class SearchPlanCommand {
  readonly filters: PlanSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: PlanSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? 20;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchPlanInput, companyId: string): SearchPlanCommand {
    const { limit, offset, ...filters } = input;
    return new SearchPlanCommand({ filters, limit, offset, companyId });
  }
}
