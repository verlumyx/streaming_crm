import { faker } from '@faker-js/faker';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { companies, type CompanyRow, type NewCompanyRow } from '@/modules/company/models/company.model';
import { uuidv7 } from '@/modules/shared/uuid';

export function buildCompany(overrides: Partial<NewCompanyRow> = {}): NewCompanyRow {
  return {
    id: uuidv7(),
    name: `${faker.company.name()} ${faker.string.alphanumeric(4)}`,
    status: 'active',
    description: null,
    createdBy: overrides.createdBy ?? uuidv7(),
    ...overrides,
  };
}

export async function createCompany(db: DbExecutor, overrides: Partial<NewCompanyRow> = {}): Promise<CompanyRow> {
  const [row] = await db.insert(companies).values(buildCompany(overrides)).returning();
  return row;
}
