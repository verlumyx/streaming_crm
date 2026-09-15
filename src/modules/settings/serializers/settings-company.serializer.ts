import type { UserCompanySummary } from '@/modules/shared/auth/membership';

export type SettingsCompanyDto = { id: string; name: string; isDefault: boolean };

export function toSettingsCompanyDto(company: UserCompanySummary): SettingsCompanyDto {
  return { id: company.id, name: company.name, isDefault: company.isDefault };
}
