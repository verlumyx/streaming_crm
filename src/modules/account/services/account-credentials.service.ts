import type { AccountRepository } from '../repositories/account.repository';
import type { SecretCipher } from './secret-cipher';
import { AccountNotFoundException } from '../exceptions/account-not-found.exception';

export type AccountCredentials = { email: string; password: string };

/** Ver credenciales: decrypts the password and writes an audit line for every access. */
export class AccountCredentialsService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly cipher: SecretCipher,
  ) {}

  async execute(id: string, companyId: string, userId: string | null): Promise<AccountCredentials> {
    const account = await this.repository.findById(id, companyId);
    if (!account) throw new AccountNotFoundException();

    // Audit hook: replace with a persistent audit log when that module exists.
    console.info({
      event: 'account.credentials.accessed',
      userId,
      accountId: account.id,
      companyId: account.companyId,
      code: account.code,
    });

    return { email: account.email, password: this.cipher.decrypt(account.passwordEncrypted) };
  }
}
