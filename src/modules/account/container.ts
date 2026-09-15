import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { decrypt, encrypt } from '@/modules/shared/crypto';
import { createServiceContainer } from '@/modules/service/container';
import { createTransactionContainer } from '@/modules/transaction/container';
import { DrizzleAccountRepository } from './repositories/drizzle-account.repository';
import type { SecretCipher } from './services/secret-cipher';
import { AccountCreateService } from './services/account-create.service';
import { AccountCredentialsService } from './services/account-credentials.service';
import { AccountFindService } from './services/account-find.service';
import { AccountRenewService } from './services/account-renew.service';
import { AccountSearchService } from './services/account-search.service';
import { AccountUpdateService } from './services/account-update.service';

export function createAccountContainer(db: DbExecutor) {
  const repository = new DrizzleAccountRepository(db); // the ONLY place the concrete repository is named
  // Same `db | tx`: ledger rows commit or roll back with the account.
  const { repository: serviceRepository } = createServiceContainer(db);
  const { repository: transactionRepository } = createTransactionContainer(db);
  const cipher: SecretCipher = { encrypt, decrypt };

  return {
    repository,
    createService: new AccountCreateService(repository, serviceRepository, transactionRepository, cipher),
    updateService: new AccountUpdateService(repository, cipher),
    renewService: new AccountRenewService(repository, transactionRepository),
    findService: new AccountFindService(repository),
    searchService: new AccountSearchService(repository),
    credentialsService: new AccountCredentialsService(repository, cipher),
  };
}
