import { permissionsForUser } from '@/modules/shared/auth/require-permission';
import { GetActiveMenusService } from '@/modules/menu/services/get-active-menus.service';
import { authenticate, json, requireApiCompanyAccess, unauthenticated } from '@/modules/api-auth/http/api-response';

type Context = { params: Promise<{ companyId: string }> };

/** GET /api/companies/{companyId}/menu — menu tree filtered by the role in that company, with raw urls. */
export async function GET(request: Request, { params }: Context) {
  const auth = await authenticate(request);
  if (!auth) return unauthenticated();

  const { companyId } = await params;
  const membership = await requireApiCompanyAccess(auth.user, companyId);
  if (membership instanceof Response) return membership;

  const { permissions, hasAllPermissions } = await permissionsForUser(auth.user.id, companyId);
  return json(
    await new GetActiveMenusService().execute(
      companyId,
      { isSystemOwner: Boolean(auth.user.isSystemOwner), permissions, hasAllPermissions },
      { prefixUrls: false },
    ),
  );
}
