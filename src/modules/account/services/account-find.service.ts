import type { AccountDetail, AccountRepository } from '../repositories/account.repository';
import { AccountNotFoundException } from '../exceptions/account-not-found.exception';

/** Ver / Editar: the account with its service, profiles and renewals history. */
export class AccountFindService {
  constructor(private readonly repository: AccountRepository) {}

  async execute(id: string, companyId: string): Promise<AccountDetail> {
    const detail = await this.repository.findDetail(id, companyId);
    if (!detail) throw new AccountNotFoundException();
    return detail;
  }
}
