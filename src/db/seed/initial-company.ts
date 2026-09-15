import { eq } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { user, account } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';
import { roles, ADMINISTRATOR_ROLE_NAME } from '@/modules/role/models/role.model';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { services } from '@/modules/service/models/service.model';
import { SeedCompanyServicesService } from '@/modules/service/services/seed-company-services.service';
import { uuidv7 } from '@/modules/shared/uuid';

export const INITIAL_ADMIN = {
  name: 'Administrador',
  email: 'admin@miempresa.com',
  password: 'password',
} as const;

export const INITIAL_COMPANY_NAME = 'Mi Empresa';

/**
 * Company "Mi Empresa" + role "Administrador" (permissionType all) + system-owner admin user + default membership
 * + default streaming catalogue. Idempotent: skips when the admin user already exists.
 */
export async function seedInitialCompany(
  db: DbExecutor,
  hashPassword: (plain: string) => Promise<string>,
): Promise<'created' | 'skipped'> {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, INITIAL_ADMIN.email));
  if (existing) return 'skipped';

  const userId = uuidv7();
  const companyId = uuidv7();
  const roleId = uuidv7();

  await db.insert(user).values({
    id: userId,
    name: INITIAL_ADMIN.name,
    email: INITIAL_ADMIN.email,
    emailVerified: true,
    isSystemOwner: true,
  });

  await db.insert(account).values({
    id: uuidv7(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: await hashPassword(INITIAL_ADMIN.password),
  });

  await db.insert(companies).values({
    id: companyId,
    name: INITIAL_COMPANY_NAME,
    status: 'active',
    description: 'Empresa inicial del sistema',
    createdBy: userId,
  });

  await db.insert(roles).values({
    id: roleId,
    companyId,
    name: ADMINISTRATOR_ROLE_NAME,
    status: 'active',
    description: 'Rol con acceso total al sistema',
    permissionType: 'all',
  });

  await db.insert(userCompanies).values({
    id: uuidv7(),
    userId,
    companyId,
    roleId,
    status: 'active',
    isDefault: true,
  });

  const [hasServices] = await db.select({ id: services.id }).from(services).where(eq(services.companyId, companyId)).limit(1);
  if (!hasServices) await new SeedCompanyServicesService(db).execute(companyId);

  return 'created';
}
