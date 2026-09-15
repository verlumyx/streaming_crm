import 'server-only';
import { redirect } from 'next/navigation';
import { UUID_REGEX } from '@/modules/shared/uuid';
import { requireSessionUser } from './session';
import { getMembership, resolveDefaultCompanyId, type Membership } from './membership';
import type { AuthUser } from '@/lib/auth';

export type CompanyContext = {
  user: AuthUser;
  membership: Membership;
  company: Membership['company'];
};

/**
 * Equivalent of the `company.access` guard. Runs once in `src/app/[companyId]/layout.tsx`.
 * - not a member → /dashboard?error=forbidden
 * - inactive membership, or inactive company for non-owners → fallback active company with a toast, or /no-access
 */
export async function requireCompanyAccess(companyId: string): Promise<CompanyContext> {
  const user = await requireSessionUser();

  if (!UUID_REGEX.test(companyId)) redirect('/dashboard?error=forbidden');

  const membership = await getMembership(user.id, companyId);
  if (!membership) redirect('/dashboard?error=forbidden');

  const isOwner = Boolean(user.isSystemOwner);
  const hasActiveAccess = membership.status === 'active' && (isOwner || membership.company.status === 'active');

  if (!hasActiveAccess) {
    const fallbackId = await resolveDefaultCompanyId(user.id, isOwner);
    if (fallbackId && fallbackId !== companyId) redirect(`/${fallbackId}/dashboard?error=company-inactive`);
    redirect('/no-access');
  }

  return { user, membership, company: membership.company };
}
