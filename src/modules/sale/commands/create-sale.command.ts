import type { CreateSaleInput } from '../validation/create-sale.schema';

/** Crear. `agentId` is the session user; the plan snapshot and `endDate` are resolved by the service. */
export class CreateSaleCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly agentId: string,
    readonly clientId: string,
    readonly planId: string,
    readonly startDate: string,
    readonly profileIds: readonly string[],
    readonly notes: string | null,
  ) {}

  static fromInput(input: CreateSaleInput, companyId: string, agentId: string): CreateSaleCommand {
    return new CreateSaleCommand(
      input.id,
      companyId,
      agentId,
      input.clientId,
      input.planId,
      input.startDate,
      input.profileIds,
      input.notes,
    );
  }
}
