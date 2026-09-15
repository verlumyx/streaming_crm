import { auth } from '@/lib/auth';
import { account, type UserRow } from '@/db/auth-schema';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { uuidv7 } from '@/modules/shared/uuid';

/** Gives a factory user an email+password (credential) account hashed with better-auth. */
export async function withPassword(db: DbExecutor, user: UserRow, password = 'password'): Promise<UserRow> {
  const ctx = await auth.$context;
  await db.insert(account).values({
    id: uuidv7(),
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: await ctx.password.hash(password),
  });
  return user;
}
