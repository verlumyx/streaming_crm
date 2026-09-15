import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { getPermissionTree } from '@/modules/permission/queries/all-permission-actions';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { ROLE_PERMISSIONS } from '@/modules/role/permissions';
import { roleRoutes } from '@/modules/role/routes';
import { createRoleContainer } from '@/modules/role/container';
import { RoleNotFoundException } from '@/modules/role/exceptions/role-not-found.exception';
import { toRoleDto } from '@/modules/role/serializers/role.serializer';
import { RoleEdit } from '@/modules/role/ui/components/RoleEdit';

export const metadata: Metadata = { title: 'Editar rol' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). */
export default async function RoleEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, ROLE_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createRoleContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof RoleNotFoundException) notFound();
    throw error;
  }

  const role = toRoleDto(row);
  const modules = await getPermissionTree();

  return (
    <PageShell
      back={<BackLink href={roleRoutes.show(companyId, role.id)}>{role.name}</BackLink>}
      title="Editar rol"
      subtitle="Modifica la información y los permisos del rol"
    >
      <RoleEdit companyId={companyId} role={role} modules={modules} />
    </PageShell>
  );
}
