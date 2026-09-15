import { faker } from '@faker-js/faker';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { clients, CLIENT_CODE_PREFIX, type ClientRow, type NewClientRow } from '@/modules/client/models/client.model';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { defined } from './utils';

let sequence = 0;

export function buildClient(overrides: Partial<NewClientRow> & { companyId: string }): NewClientRow {
  sequence++;
  return {
    id: uuidv7(),
    code: formatSequentialCode(CLIENT_CODE_PREFIX, 900000 + sequence),
    name: faker.person.fullName(),
    phone: `+58 412${faker.string.numeric(7)}`,
    email: `client${sequence}.${faker.string.alphanumeric(6).toLowerCase()}@example.com`,
    status: 'active',
    notes: null,
    ...defined(overrides),
  } as NewClientRow;
}

export async function createClient(
  db: DbExecutor,
  overrides: Partial<NewClientRow> & { companyId: string },
): Promise<ClientRow> {
  const [row] = await db.insert(clients).values(buildClient(overrides)).returning();
  return row;
}
