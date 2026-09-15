import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/modules/shared/auth/session';
import { resolveDefaultCompanyId } from '@/modules/shared/auth/membership';

type Props = { searchParams: Promise<{ error?: string }> };

/** Bridge after login: sends the user to their default (or first accessible) company dashboard. */
export default async function DashboardBridgePage({ searchParams }: Props) {
  const user = await requireSessionUser();
  const { error } = await searchParams;

  const companyId = await resolveDefaultCompanyId(user.id, Boolean(user.isSystemOwner));
  if (companyId) redirect(error ? `/${companyId}/dashboard?error=${error}` : `/${companyId}/dashboard`);

  redirect('/no-access');
}
