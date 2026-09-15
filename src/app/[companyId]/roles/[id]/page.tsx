import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { getPermissionTree } from '@/modules/permission/queries/all-permission-actions';
import { ROLE_PERMISSIONS } from '@/modules/role/permissions';
import { createRoleContainer } from '@/modules/role/container';
import { RoleNotFoundException } from '@/modules/role/exceptions/role-not-found.exception';
import { toRoleDto } from '@/modules/role/serializers/role.serializer';
import { RoleShow } from '@/modules/role/ui/components/RoleShow';

export const metadata: Metadata = { title: 'Rol' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function RoleShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, ROLE_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let row;
  try {
    row = await createRoleContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof RoleNotFoundException) notFound();
    throw error;
  }

  const [modules, canUpdate, canUpdateStatus] = await Promise.all([
    getPermissionTree(),
    hasPermission(companyId, ROLE_PERMISSIONS.UPDATE),
    hasPermission(companyId, ROLE_PERMISSIONS.UPDATE_STATUS),
  ]);

  return (
    <RoleShow
      companyId={companyId}
      role={toRoleDto(row)}
      modules={modules}
      canUpdate={canUpdate}
      canUpdateStatus={canUpdateStatus}
    />
  );
}
