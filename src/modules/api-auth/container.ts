import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleApiAuthRepository } from './repositories/drizzle-api-auth.repository';
import { NodeApiTokenFactory } from './infrastructure/node-api-token-factory';
import { BetterAuthPasswordVerifier } from './infrastructure/better-auth-password-verifier';
import { ApiLoginService } from './services/api-login.service';
import { ApiAuthenticateService } from './services/api-authenticate.service';
import { ApiLogoutService } from './services/api-logout.service';

export function createApiAuthContainer(db: DbExecutor) {
  const repository = new DrizzleApiAuthRepository(db); // the ONLY place the concrete repository is named
  const tokens = new NodeApiTokenFactory();

  return {
    repository,
    tokens,
    loginService: new ApiLoginService(repository, new BetterAuthPasswordVerifier(), tokens),
    authenticateService: new ApiAuthenticateService(repository, tokens),
    logoutService: new ApiLogoutService(repository),
  };
}
