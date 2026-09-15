'use server';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { companies, user, userCompanies } from '@/db/schema';
import {
  decideLoginEligibility,
  type LoginEligibility,
  type LoginMembership,
} from '@/modules/shared/auth/login-eligibility';

const emailSchema = z.email();

/**
 * Pre-login gate ported from the original Fortify `AuthenticateUser`: users whose memberships
 * are all inactive, or whose companies are all inactive, cannot sign in (system owners and
 * users without memberships always can). Unknown emails return `ok` so better-auth answers
 * with the generic credentials error and we never confirm whether an account exists.
 */
export async function checkLoginEligibilityAction(email: string): Promise<LoginEligibility> {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: true };

  const rows = await db
    .select({
      isSystemOwner: user.isSystemOwner,
      membershipStatus: userCompanies.status,
      companyStatus: companies.status,
    })
    .from(user)
    .leftJoin(userCompanies, eq(userCompanies.userId, user.id))
    .leftJoin(companies, eq(companies.id, userCompanies.companyId))
    .where(eq(sql`lower(${user.email})`, parsed.data));

  if (rows.length === 0) return { ok: true };

  const memberships: LoginMembership[] = rows.flatMap((row) =>
    row.membershipStatus === null
      ? []
      : [{ membershipStatus: row.membershipStatus, companyStatus: row.companyStatus ?? 'inactive' }],
  );

  return decideLoginEligibility(memberships, rows[0].isSystemOwner);
}
