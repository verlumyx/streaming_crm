import { db } from '@/db/client';
import { createApiAuthContainer } from '@/modules/api-auth/container';
import { authenticate, json, unauthenticated } from '@/modules/api-auth/http/api-response';

/** POST /api/logout — revokes the token of the current device only. */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthenticated();

  await createApiAuthContainer(db).logoutService.execute(auth.tokenId);
  return json({ message: 'Sesión cerrada correctamente.' });
}
