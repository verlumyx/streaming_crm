import { canTransitionProfile, type AccountRow } from '../models/account.model';
import type { AccountRepository } from '../repositories/account.repository';
import type { UpdateAccountCommand } from '../commands/update-account.command';
import type { SecretCipher } from './secret-cipher';
import { AccountNotFoundException } from '../exceptions/account-not-found.exception';
import { AccountEmailAlreadyExistsException } from '../exceptions/account-email-already-exists.exception';
import { AccountProfileNotInAccountException } from '../exceptions/account-profile-not-in-account.exception';
import { AccountProfileTransitionNotAllowedException } from '../exceptions/account-profile-transition-not-allowed.exception';

/** Actualizar: header + PIN / status / notes of its profiles. The service is immutable; blank password keeps it. */
export class AccountUpdateService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly cipher: SecretCipher,
  ) {}

  async execute(id: string, companyId: string, command: UpdateAccountCommand): Promise<AccountRow> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new AccountNotFoundException();

    if (await this.repository.existsByEmail(command.email, row.serviceId, row.id)) {
      throw new AccountEmailAlreadyExistsException();
    }

    const profileByNumber = new Map((await this.repository.profilesOf(row.id)).map((p) => [p.number, p]));

    command.profiles.forEach((line, index) => {
      if (!profileByNumber.has(line.number)) throw new AccountProfileNotInAccountException(index, line.number);
    });

    for (const line of command.profiles) {
      const current = profileByNumber.get(line.number)!;
      if (line.status && !canTransitionProfile(current.status, line.status)) {
        throw new AccountProfileTransitionNotAllowedException(line.number, current.status, line.status);
      }
    }

    const passwordEncrypted = command.password !== null ? this.cipher.encrypt(command.password) : null;
    await this.repository.update(row, command, passwordEncrypted);
    await this.repository.updateProfiles(row.id, command.profiles);

    return this.repository.findOrFail(id, companyId);
  }
}
