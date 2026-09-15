import { and, count, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { account, user, type UserRow } from '@/db/auth-schema';
import { apiTokens } from '../models/api-token.model';
import type { ApiAuthRepository } from './api-auth.repository';

export class DrizzleApiAuthRepository implements ApiAuthRepository {
  constructor(private readonly db: DbExecutor) {}

  async findCredentialUserByEmail(email: string): Promise<{ user: UserRow; passwordHash: string } | null> {
    const [row] = await this.db
      .select({ user, passwordHash: account.password })
      .from(user)
      .innerJoin(account, and(eq(account.userId, user.id), eq(account.providerId, 'credential')))
      .where(sql`lower(${user.email}) = lower(${email})`)
      .limit(1);
    if (!row?.passwordHash) return null;
    return { user: row.user, passwordHash: row.passwordHash };
  }

  async countTokens(userId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(apiTokens).where(eq(apiTokens.userId, userId));
    return row.n;
  }

  async createToken(input: { id: string; userId: string; name: string; tokenHash: string }): Promise<void> {
    await this.db.insert(apiTokens).values(input);
  }

  async findUserByTokenHash(tokenHash: string): Promise<{ tokenId: string; user: UserRow } | null> {
    const [row] = await this.db
      .select({ tokenId: apiTokens.id, user })
      .from(apiTokens)
      .innerJoin(user, eq(user.id, apiTokens.userId))
      .where(eq(apiTokens.tokenHash, tokenHash))
      .limit(1);
    if (!row) return null;
    await this.db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.tokenId));
    return row;
  }

  async revokeToken(tokenId: string): Promise<void> {
    // EXCEPTION to the no-delete policy: API tokens are disposable session credentials with no historical value.
    await this.db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
  }
}
