import type { Metadata } from 'next';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { getPermissionTree } from '@/modules/permission/queries/all-permission-actions';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { ROLE_PERMISSIONS } from '@/modules/role/permissions';
import { roleRoutes } from '@/modules/role/routes';
import { RoleCreate } from '@/modules/role/ui/components/RoleCreate';

export const metadata: Metadata = { title: 'Nuevo rol' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). The draft id is generated here so server and client render the same value. */
export default async function RoleCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, ROLE_PERMISSIONS.CREATE);

  const modules = await getPermissionTree();

  return (
    <PageShell
      back={<BackLink href={roleRoutes.index(companyId)}>Roles</BackLink>}
      title="Nuevo rol"
      subtitle="Completa la información para crear un nuevo rol"
    >
      <RoleCreate companyId={companyId} initialId={uuidv7()} modules={modules} />
    </PageShell>
  );
}
