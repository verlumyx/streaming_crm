import type { UserRow } from '@/db/auth-schema';

export interface ApiAuthRepository {
  /** The user and the hash of its credential (email + password) account, or null. Case-insensitive email. */
  findCredentialUserByEmail(email: string): Promise<{ user: UserRow; passwordHash: string } | null>;
  countTokens(userId: string): Promise<number>;
  createToken(input: { id: string; userId: string; name: string; tokenHash: string }): Promise<void>;
  /** Resolves a token hash to its user and records `last_used_at`. */
  findUserByTokenHash(tokenHash: string): Promise<{ tokenId: string; user: UserRow } | null>;
  /** Revokes one device token (tokens are disposable credentials: physical deletion is allowed). */
  revokeToken(tokenId: string): Promise<void>;
}
