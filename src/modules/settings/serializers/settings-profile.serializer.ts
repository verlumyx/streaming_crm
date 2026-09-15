import type { UserRow } from '@/db/auth-schema';

export type SettingsProfileDto = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};

export function toSettingsProfileDto(row: UserRow): SettingsProfileDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
  };
}
