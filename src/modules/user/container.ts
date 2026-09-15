import { auth } from '@/lib/auth';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';
import { DrizzleUserCompanyRepository } from './repositories/drizzle-user-company.repository';
import type { PasswordHasher } from './services/password-hasher';
import { UserCheckEmailService } from './services/user-check-email.service';
import { UserCreateService } from './services/user-create.service';
import { UserFindService } from './services/user-find.service';
import { UserSearchService } from './services/user-search.service';
import { UserUpdateService } from './services/user-update.service';
import { UserUpdateStatusService } from './services/user-update-status.service';

/** better-auth's own hasher, so credential accounts created here can sign in through `/api/auth/sign-in/email`. */
const betterAuthPasswordHasher: PasswordHasher = {
  async hash(plain) {
    const context = await auth.$context;
    return context.password.hash(plain);
  },
};

export function createUserContainer(db: DbExecutor, passwordHasher: PasswordHasher = betterAuthPasswordHasher) {
  // the ONLY place the concrete repositories are named
  const repository = new DrizzleUserRepository(db);
  const userCompanyRepository = new DrizzleUserCompanyRepository(db);

  return {
    repository,
    userCompanyRepository,
    createService: new UserCreateService(repository, userCompanyRepository, passwordHasher),
    updateService: new UserUpdateService(repository, userCompanyRepository, passwordHasher),
    updateStatusService: new UserUpdateStatusService(userCompanyRepository),
    findService: new UserFindService(repository),
    searchService: new UserSearchService(repository),
    checkEmailService: new UserCheckEmailService(repository, userCompanyRepository),
  };
}
