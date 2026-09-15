import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth, type AuthUser } from '@/lib/auth';

/** Session of the current request (memoized per request through React.cache). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export const getSessionUser = cache(async (): Promise<AuthUser | null> => {
  const session = await getSession();
  return session?.user ?? null;
});

/** For pages/layouts: redirects to /login when there is no session. */
export async function requireSessionUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}
