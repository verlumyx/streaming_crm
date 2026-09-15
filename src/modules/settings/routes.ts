/** Settings sections, in menu order. The slug is the last URL segment. */
export const SETTINGS_SECTIONS = ['profile', 'password', 'two-factor', 'appearance', 'company'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

const base = (companyId: string) => `/${companyId}/settings`;

export const settingsRoutes = {
  index: (companyId: string) => base(companyId),
  section: (companyId: string, section: SettingsSection) => `${base(companyId)}/${section}`,
  profile: (companyId: string) => `${base(companyId)}/profile`,
  password: (companyId: string) => `${base(companyId)}/password`,
  twoFactor: (companyId: string) => `${base(companyId)}/two-factor`,
  appearance: (companyId: string) => `${base(companyId)}/appearance`,
  company: (companyId: string) => `${base(companyId)}/company`,
};
