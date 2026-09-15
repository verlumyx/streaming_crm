import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { createRoleContainer } from '@/modules/role/container';
import { toRoleOptionDto } from '@/modules/role/serializers/role.serializer';
import { USER_PERMISSIONS } from '@/modules/user/permissions';
import { userRoutes } from '@/modules/user/routes';
import { UserCreate } from '@/modules/user/ui/components/UserCreate';

export const metadata: Metadata = { title: 'Nuevo usuario' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form, 2 steps). The draft id is generated here so server and client render the same value. */
export default async function UserCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, USER_PERMISSIONS.CREATE);

  const roles = await createRoleContainer(db).activeListService.execute(companyId);

  return (
    <PageShell
      back={<BackLink href={userRoutes.index(companyId)}>Usuarios</BackLink>}
      title="Nuevo usuario"
      subtitle="Crea un usuario o da acceso a esta empresa a un usuario existente"
    >
      <UserCreate companyId={companyId} initialId={uuidv7()} roles={roles.map(toRoleOptionDto)} />
    </PageShell>
  );
}
