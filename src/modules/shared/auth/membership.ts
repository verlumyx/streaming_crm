import 'server-only';
import { cache } from 'react';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { companies } from '@/modules/company/models/company.model';

export type Membership = NonNullable<Awaited<ReturnType<typeof loadMembership>>>;

async function loadMembership(userId: string, companyId: string) {
  return db.query.userCompanies.findFirst({
    where: and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)),
    with: {
      company: true,
      role: { with: { permissions: true } },
    },
  });
}

/** The user ↔ company row (with role + permissions + company). Memoized per request. */
export const getMembership = cache(loadMembership);

export type UserCompanySummary = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  membershipStatus: 'active' | 'inactive';
  isDefault: boolean;
  roleId: string | null;
};

/** Every company the user belongs to, ordered by name. */
export const getUserCompanies = cache(async (userId: string): Promise<UserCompanySummary[]> => {
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      status: companies.status,
      membershipStatus: userCompanies.status,
      isDefault: userCompanies.isDefault,
      roleId: userCompanies.roleId,
    })
    .from(userCompanies)
    .innerJoin(companies, eq(companies.id, userCompanies.companyId))
    .where(eq(userCompanies.userId, userId))
    .orderBy(asc(companies.name));
  return rows;
});

/**
 * Companies the user can actually work in: active membership and active company
 * (system owners may enter inactive companies too).
 */
export async function getAccessibleCompanies(userId: string, isSystemOwner: boolean): Promise<UserCompanySummary[]> {
  const all = await getUserCompanies(userId);
  return all.filter((c) => c.membershipStatus === 'active' && (isSystemOwner || c.status === 'active'));
}

/** Default company if accessible, else the first accessible one, else null. */
export async function resolveDefaultCompanyId(userId: string, isSystemOwner: boolean): Promise<string | null> {
  const accessible = await getAccessibleCompanies(userId, isSystemOwner);
  if (accessible.length === 0) return null;
  return accessible.find((c) => c.isDefault)?.id ?? accessible[0].id;
}
