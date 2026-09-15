import { permissionsForUser } from '@/modules/shared/auth/require-permission';
import { GetActiveMenusService } from '@/modules/menu/services/get-active-menus.service';
import { toAuthCompanyDto } from '@/modules/api-auth/serializers/api-auth.serializer';
import { authenticate, json, requireApiCompanyAccess, unauthenticated } from '@/modules/api-auth/http/api-response';

type Context = { params: Promise<{ companyId: string }> };

/** GET /api/companies/{companyId}/context — membership, permissions and menu (raw urls) in one request. */
export async function GET(request: Request, { params }: Context) {
  const auth = await authenticate(request);
  if (!auth) return unauthenticated();

  const { companyId } = await params;
  const membership = await requireApiCompanyAccess(auth.user, companyId);
  if (membership instanceof Response) return membership;

  const { permissions, hasAllPermissions } = await permissionsForUser(auth.user.id, companyId);
  const menu = await new GetActiveMenusService().execute(
    companyId,
    { isSystemOwner: Boolean(auth.user.isSystemOwner), permissions, hasAllPermissions },
    { prefixUrls: false },
  );

  return json({
    company: toAuthCompanyDto({
      id: membership.company.id,
      name: membership.company.name,
      status: membership.company.status,
      roleId: membership.roleId,
      isDefault: membership.isDefault,
    }),
    permissions,
    menu,
  });
}
