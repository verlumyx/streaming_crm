import type { UserRow } from '@/db/auth-schema';
import type { ApiAuthRepository } from '../repositories/api-auth.repository';
import type { ApiTokenFactory } from './ports';

/** Resolves an `Authorization: Bearer <token>` header to the token id and its user. */
export class ApiAuthenticateService {
  constructor(
    private readonly repository: ApiAuthRepository,
    private readonly tokens: ApiTokenFactory,
  ) {}

  async execute(authorization: string | null): Promise<{ tokenId: string; user: UserRow } | null> {
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) return null;
    return this.repository.findUserByTokenHash(this.tokens.hash(match[1]));
  }
}
