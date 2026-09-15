import type { AccountListItem, AccountRepository } from '../repositories/account.repository';
import type { SearchAccountCommand } from '../commands/search-account.command';

/** Listar: page of accounts with their service and profile availability. */
export class AccountSearchService {
  constructor(private readonly repository: AccountRepository) {}

  execute(command: SearchAccountCommand): Promise<{ data: AccountListItem[]; total: number }> {
    return this.repository.search(command);
  }
}
