import { getUserCompanies } from '@/modules/shared/auth/membership';
import { toAuthUserDto } from '@/modules/api-auth/serializers/api-auth.serializer';
import { authenticate, json, unauthenticated } from '@/modules/api-auth/http/api-response';

/** GET /api/me — the token's user with all its company memberships. */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthenticated();

  return json({ user: toAuthUserDto(auth.user, await getUserCompanies(auth.user.id)) });
}
