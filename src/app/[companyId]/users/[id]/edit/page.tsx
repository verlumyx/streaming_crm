import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { createRoleContainer } from '@/modules/role/container';
import { toRoleOptionDto } from '@/modules/role/serializers/role.serializer';
import { USER_PERMISSIONS } from '@/modules/user/permissions';
import { userRoutes } from '@/modules/user/routes';
import { createUserContainer } from '@/modules/user/container';
import { UserNotFoundException } from '@/modules/user/exceptions/user-not-found.exception';
import { toUserDto } from '@/modules/user/serializers/user.serializer';
import { UserEdit } from '@/modules/user/ui/components/UserEdit';

export const metadata: Metadata = { title: 'Editar usuario' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). */
export default async function UserEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, USER_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createUserContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof UserNotFoundException) notFound();
    throw error;
  }

  const user = toUserDto(row);
  const roles = await createRoleContainer(db).activeListService.execute(companyId);

  return (
    <PageShell
      back={<BackLink href={userRoutes.show(companyId, user.id)}>{user.name}</BackLink>}
      title="Editar usuario"
      subtitle="Modifica los datos del usuario y su rol en esta empresa"
    >
      <UserEdit companyId={companyId} user={user} roles={roles.map(toRoleOptionDto)} />
    </PageShell>
  );
}
