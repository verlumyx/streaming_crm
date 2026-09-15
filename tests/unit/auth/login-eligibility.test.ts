import { describe, expect, it } from 'vitest';
import {
  decideLoginEligibility,
  LOGIN_ELIGIBILITY_MESSAGES,
  type LoginMembership,
} from '@/modules/shared/auth/login-eligibility';

const membership = (
  membershipStatus: LoginMembership['membershipStatus'],
  companyStatus: LoginMembership['companyStatus'],
): LoginMembership => ({ membershipStatus, companyStatus });

describe('decideLoginEligibility', () => {
  it('lets a system owner in even when every membership and company is inactive', () => {
    const result = decideLoginEligibility([membership('inactive', 'inactive')], true);

    expect(result).toEqual({ ok: true });
  });

  it('lets a user without memberships in', () => {
    expect(decideLoginEligibility([], false)).toEqual({ ok: true });
  });

  it('rejects a user whose memberships are all inactive', () => {
    const result = decideLoginEligibility(
      [membership('inactive', 'active'), membership('inactive', 'active')],
      false,
    );

    expect(result).toEqual({ ok: false, message: LOGIN_ELIGIBILITY_MESSAGES.userInactive });
    expect(LOGIN_ELIGIBILITY_MESSAGES.userInactive).toBe('El usuario está inactivo.');
  });

  it('rejects a user with a single active membership whose company is inactive', () => {
    const result = decideLoginEligibility([membership('active', 'inactive')], false);

    expect(result).toEqual({ ok: false, message: LOGIN_ELIGIBILITY_MESSAGES.companyInactive });
    expect(LOGIN_ELIGIBILITY_MESSAGES.companyInactive).toBe('La empresa del usuario está inactiva.');
  });

  it('uses the ambiguous message when several memberships exist and none is fully active', () => {
    const result = decideLoginEligibility(
      [membership('active', 'inactive'), membership('inactive', 'active')],
      false,
    );

    expect(result).toEqual({
      ok: false,
      message: LOGIN_ELIGIBILITY_MESSAGES.userOrCompanyInactive,
    });
    expect(LOGIN_ELIGIBILITY_MESSAGES.userOrCompanyInactive).toBe(
      'El usuario o la empresa están inactivos.',
    );
  });

  it('accepts a user with at least one active membership in an active company', () => {
    const result = decideLoginEligibility(
      [membership('inactive', 'active'), membership('active', 'active')],
      false,
    );

    expect(result).toEqual({ ok: true });
  });
});
