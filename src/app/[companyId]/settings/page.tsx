import { redirect } from 'next/navigation';
import { settingsRoutes } from '@/modules/settings/routes';

type Props = { params: Promise<{ companyId: string }> };

export default async function SettingsIndexPage({ params }: Props) {
  const { companyId } = await params;
  redirect(settingsRoutes.profile(companyId));
}
