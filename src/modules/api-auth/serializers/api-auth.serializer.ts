import type { UserCompanySummary } from '@/modules/shared/auth/membership';

/** Snake_case shapes: they are the public contract of the mobile API. */
export type AuthCompanyDto = { id: string; name: string; status: string; role_id: string | null; is_default: boolean };
export type AuthUserDto = {
  id: string;
  name: string;
  email: string;
  is_system_owner: boolean;
  companies: AuthCompanyDto[];
};

export function toAuthCompanyDto(company: Pick<UserCompanySummary, 'id' | 'name' | 'status' | 'roleId' | 'isDefault'>): AuthCompanyDto {
  return {
    id: company.id,
    name: company.name,
    status: company.status,
    role_id: company.roleId,
    is_default: company.isDefault,
  };
}

export function toAuthUserDto(
  user: { id: string; name: string; email: string; isSystemOwner?: boolean | null },
  companies: UserCompanySummary[],
): AuthUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_system_owner: Boolean(user.isSystemOwner),
    companies: companies.map(toAuthCompanyDto),
  };
}
