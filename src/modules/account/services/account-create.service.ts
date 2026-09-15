import type { ServiceRepository } from '@/modules/service/repositories/service.repository';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import { uuidv7 } from '@/modules/shared/uuid';
import type { AccountRow } from '../models/account.model';
import type { AccountRepository } from '../repositories/account.repository';
import type { CreateAccountCommand } from '../commands/create-account.command';
import type { SecretCipher } from './secret-cipher';
import { AccountServiceInvalidException } from '../exceptions/account-service-invalid.exception';
import { AccountEmailAlreadyExistsException } from '../exceptions/account-email-already-exists.exception';
import { AccountProfileNumberOutOfRangeException } from '../exceptions/account-profile-number-out-of-range.exception';

/**
 * Crear: account (code `ACC000001`, encrypted password) + one available profile per service slot
 * (PINs pre-loaded by number) + `purchase` renewal row + `streaming_account` ledger expense.
 * Runs on the transaction opened by the action, so every write commits or rolls back together.
 */
export class AccountCreateService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly serviceRepository: Pick<ServiceRepository, 'findById'>,
    private readonly transactionRepository: Pick<TransactionRepository, 'create'>,
    private readonly cipher: SecretCipher,
  ) {}

  async execute(command: CreateAccountCommand): Promise<AccountRow> {
    const service = await this.serviceRepository.findById(command.serviceId, command.companyId);
    if (!service) throw new AccountServiceInvalidException();

    if (await this.repository.existsByEmail(command.email, service.id)) {
      throw new AccountEmailAlreadyExistsException();
    }

    command.profiles.forEach((line, index) => {
      if (line.number < 1 || line.number > service.maxProfiles) {
        throw new AccountProfileNumberOutOfRangeException(index, service.maxProfiles);
      }
    });

    await this.repository.create(command, this.cipher.encrypt(command.password));
    const account = await this.repository.findOrFail(command.id, command.companyId);

    const pinByNumber = new Map(command.profiles.map((line) => [line.number, line.pin]));
    await this.repository.createProfiles(
      account.id,
      Array.from({ length: service.maxProfiles }, (_, i) => ({ number: i + 1, pin: pinByNumber.get(i + 1) ?? null })),
    );

    await this.repository.createRenewal({
      id: uuidv7(),
      companyId: command.companyId,
      accountId: account.id,
      type: 'purchase',
      amount: command.cost,
      periodStart: command.purchaseDate,
      periodEnd: command.nextRenewal,
      paidAt: command.purchaseDate,
      notes: null,
      createdBy: command.createdBy,
    });

    await this.transactionRepository.create(
      new CreateTransactionCommand(
        uuidv7(),
        command.companyId,
        'streaming_account',
        command.cost,
        command.purchaseDate,
        `Compra de cuenta ${account.code}`,
        {
          relatedType: 'Account',
          relatedId: account.id,
          periodFrom: command.purchaseDate,
          periodTo: command.nextRenewal,
          recordedBy: command.createdBy,
          paymentMethod: 'cash',
        },
      ),
    );

    return account;
  }
}
