import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/modules/shared/auth/session';
import { resolveDefaultCompanyId } from '@/modules/shared/auth/membership';
import { isSettingsSection, settingsRoutes } from '@/modules/settings/routes';

type Props = { params: Promise<{ slug?: string[] }> };

/**
 * Bridge for company-less links (`/settings`, `/settings/profile`, …): settings render inside the
 * company shell, so resolve the user's default company and move there.
 */
export default async function SettingsBridgePage({ params }: Props) {
  const { slug } = await params;
  const user = await requireSessionUser();

  const companyId = await resolveDefaultCompanyId(user.id, Boolean(user.isSystemOwner));
  if (!companyId) redirect('/no-access');

  const [section] = slug ?? [];
  redirect(settingsRoutes.section(companyId, isSettingsSection(section) ? section : 'profile'));
}
