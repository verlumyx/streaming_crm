import { faker } from '@faker-js/faker';
import type { InferInsertModel } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { user, type UserRow } from '@/db/auth-schema';
import { uuidv7 } from '@/modules/shared/uuid';

type NewUserRow = InferInsertModel<typeof user>;

export function buildUser(overrides: Partial<NewUserRow> = {}): NewUserRow {
  return {
    id: uuidv7(),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    emailVerified: true,
    isSystemOwner: false,
    ...overrides,
  };
}

export async function createUser(db: DbExecutor, overrides: Partial<NewUserRow> = {}): Promise<UserRow> {
  const [row] = await db.insert(user).values(buildUser(overrides)).returning();
  return row;
}
