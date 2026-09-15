import type { ApiAuthRepository } from '../repositories/api-auth.repository';

/** Revokes only the token of the current device. */
export class ApiLogoutService {
  constructor(private readonly repository: ApiAuthRepository) {}

  execute(tokenId: string): Promise<void> {
    return this.repository.revokeToken(tokenId);
  }
}
