import type { Metadata } from 'next';
import { db } from '@/db/client';
import { requireSessionUser } from '@/modules/shared/auth/session';
import { createSettingsContainer } from '@/modules/settings/container';
import { toSettingsProfileDto } from '@/modules/settings/serializers/settings-profile.serializer';
import { ProfileEdit } from '@/modules/settings/ui/components/ProfileEdit';

export const metadata: Metadata = { title: 'Configuración de perfil' };

type Props = { params: Promise<{ companyId: string }> };

/** Perfil. Settings are per user: the page reads the session user, no role permission. */
export default async function SettingsProfilePage({ params }: Props) {
  const { companyId } = await params;
  const sessionUser = await requireSessionUser();

  const row = await createSettingsContainer(db).findProfileService.execute(sessionUser.id);

  return <ProfileEdit companyId={companyId} profile={toSettingsProfileDto(row)} />;
}
