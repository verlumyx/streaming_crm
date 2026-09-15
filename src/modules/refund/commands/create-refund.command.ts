import type { CreateRefundInput } from '../validation/create-refund.schema';

/** Crear: a pending refund for a sale of the company. The client is copied from the sale by the service. */
export class CreateRefundCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly saleId: string,
    readonly amount: number,
    readonly reason: string | null,
    readonly requestedBy: string | null,
  ) {}

  static fromInput(input: CreateRefundInput, companyId: string, requestedBy: string | null): CreateRefundCommand {
    return new CreateRefundCommand(input.id, companyId, input.saleId, input.amount, input.reason, requestedBy);
  }
}
