import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import { uuidv7 } from '@/modules/shared/uuid';
import { todayIsoDate } from '@/lib/format';
import type { AccountRow } from '../models/account.model';
import type { AccountRepository } from '../repositories/account.repository';
import type { RenewAccountCommand } from '../commands/renew-account.command';
import { AccountNotFoundException } from '../exceptions/account-not-found.exception';
import { AccountRenewalDateNotAfterException } from '../exceptions/account-renewal-date-not-after.exception';

/**
 * Registrar renovación: `renewal` row (previous next renewal → new one, paid today), account next renewal
 * and cost = amount, and a `streaming_account_renewal` ledger expense — all on the action's transaction.
 */
export class AccountRenewService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly transactionRepository: Pick<TransactionRepository, 'create'>,
    private readonly today: () => string = () => todayIsoDate(),
  ) {}

  async execute(command: RenewAccountCommand): Promise<AccountRow> {
    const row = await this.repository.findById(command.accountId, command.companyId);
    if (!row) throw new AccountNotFoundException();

    if (command.nextRenewal <= row.nextRenewal) throw new AccountRenewalDateNotAfterException();

    const previousRenewal = row.nextRenewal;
    const paidAt = this.today();

    await this.repository.createRenewal({
      id: command.id,
      companyId: row.companyId,
      accountId: row.id,
      type: 'renewal',
      amount: command.amount,
      periodStart: previousRenewal,
      periodEnd: command.nextRenewal,
      paidAt,
      notes: command.notes,
      createdBy: command.createdBy,
    });

    await this.repository.applyRenewal(row, command.nextRenewal, command.amount);

    await this.transactionRepository.create(
      new CreateTransactionCommand(
        uuidv7(),
        row.companyId,
        'streaming_account_renewal',
        command.amount,
        paidAt,
        `Renovación de cuenta ${row.code}`,
        {
          relatedType: 'Account',
          relatedId: row.id,
          periodFrom: previousRenewal,
          periodTo: command.nextRenewal,
          recordedBy: command.createdBy,
          paymentMethod: 'cash',
        },
      ),
    );

    return this.repository.findOrFail(command.accountId, command.companyId);
  }
}
