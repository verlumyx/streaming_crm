import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { USER_PERMISSIONS } from '@/modules/user/permissions';
import { createUserContainer } from '@/modules/user/container';
import { UserNotFoundException } from '@/modules/user/exceptions/user-not-found.exception';
import { toUserDto } from '@/modules/user/serializers/user.serializer';
import { UserShow } from '@/modules/user/ui/components/UserShow';

export const metadata: Metadata = { title: 'Usuario' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function UserShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, USER_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createUserContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof UserNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canUpdateStatus] = await Promise.all([
    hasPermission(companyId, USER_PERMISSIONS.UPDATE),
    hasPermission(companyId, USER_PERMISSIONS.UPDATE_STATUS),
  ]);

  return (
    <UserShow companyId={companyId} user={toUserDto(row)} canUpdate={canUpdate} canUpdateStatus={canUpdateStatus} />
  );
}
