import type { Metadata } from 'next';
import { db } from '@/db/client';
import { requireSessionUser } from '@/modules/shared/auth/session';
import { createSettingsContainer } from '@/modules/settings/container';
import { TwoFactorSettings } from '@/modules/settings/ui/components/TwoFactorSettings';

export const metadata: Metadata = { title: 'Autenticación de dos factores' };

/** Autenticación de dos factores. The flag is read from the DB (the session cookie cache may lag). */
export default async function SettingsTwoFactorPage() {
  const sessionUser = await requireSessionUser();
  const row = await createSettingsContainer(db).findProfileService.execute(sessionUser.id);

  return <TwoFactorSettings twoFactorEnabled={Boolean(row.twoFactorEnabled)} />;
}
