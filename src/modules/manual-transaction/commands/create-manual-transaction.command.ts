import type { TransactionCategory } from '@/modules/transaction/models/transaction.model';
import type { CreateManualTransactionInput } from '../validation/create-manual-transaction.schema';

export type ManualTransactionLineInput = {
  readonly category: TransactionCategory;
  readonly amount: number;
  readonly description: string | null;
};

export class CreateManualTransactionCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly recordedBy: string | null,
    readonly date: string,
    readonly paymentMethod: string,
    readonly currency: string,
    readonly reference: string | null,
    readonly description: string | null,
    readonly notes: string | null,
    readonly lines: readonly ManualTransactionLineInput[],
  ) {}

  static fromInput(
    input: CreateManualTransactionInput,
    companyId: string,
    recordedBy: string | null,
  ): CreateManualTransactionCommand {
    return new CreateManualTransactionCommand(
      input.id,
      companyId,
      recordedBy,
      input.date,
      input.paymentMethod,
      input.currency,
      input.reference,
      input.description,
      input.notes,
      input.lines.map((l) => ({ category: l.category, amount: l.amount, description: l.description ?? null })),
    );
  }
}
