import type { CompanyStatus } from '@/modules/company/models/company.model';
import type { MembershipStatus } from '@/modules/shared/models/user-company.model';

export type LoginMembership = {
  membershipStatus: MembershipStatus;
  companyStatus: CompanyStatus;
};

export type LoginEligibility = { ok: true } | { ok: false; message: string };

export const LOGIN_ELIGIBILITY_MESSAGES = {
  userInactive: 'El usuario está inactivo.',
  companyInactive: 'La empresa del usuario está inactiva.',
  userOrCompanyInactive: 'El usuario o la empresa están inactivos.',
} as const;

/**
 * Ported from the original `AuthenticateUser` Fortify action:
 * - system owners and users without memberships always pass;
 * - every membership inactive → user inactive;
 * - active memberships but none of their companies active → company inactive
 *   (single membership) or the ambiguous message (several memberships).
 */
export function decideLoginEligibility(
  memberships: LoginMembership[],
  isSystemOwner: boolean,
): LoginEligibility {
  if (isSystemOwner || memberships.length === 0) {
    return { ok: true };
  }

  const activeMemberships = memberships.filter((m) => m.membershipStatus === 'active');
  if (activeMemberships.length === 0) {
    return { ok: false, message: LOGIN_ELIGIBILITY_MESSAGES.userInactive };
  }

  const fullyActive = activeMemberships.filter((m) => m.companyStatus === 'active');
  if (fullyActive.length === 0) {
    return {
      ok: false,
      message:
        memberships.length === 1
          ? LOGIN_ELIGIBILITY_MESSAGES.companyInactive
          : LOGIN_ELIGIBILITY_MESSAGES.userOrCompanyInactive,
    };
  }

  return { ok: true };
}
