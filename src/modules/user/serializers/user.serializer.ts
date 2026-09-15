import type { MembershipStatus } from '@/modules/shared/models/user-company.model';
import type { UserWithMembership } from '../repositories/user.repository';
import type { UserEmailCheck } from '../services/user-check-email.service';

export type UserDto = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  /** Membership status in the current company (`user_company.status`). */
  status: MembershipStatus;
  role: { id: string; name: string } | null;
  companyName: string;
  createdAt: string;
  updatedAt: string | null;
};

export type UserEmailCheckDto = UserEmailCheck;

export function toUserDto(row: UserWithMembership): UserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    status: row.membershipStatus,
    role: row.role ? { id: row.role.id, name: row.role.name } : null,
    companyName: row.companyName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toUserEmailCheckDto(check: UserEmailCheck): UserEmailCheckDto {
  return {
    exists: check.exists,
    alreadyInCompany: check.alreadyInCompany,
    user: check.user ? { id: check.user.id, name: check.user.name } : null,
  };
}
