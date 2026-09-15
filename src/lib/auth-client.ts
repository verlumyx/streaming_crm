import { createAuthClient } from 'better-auth/react';
import { adminClient, inferAdditionalFields, twoFactorClient } from 'better-auth/client/plugins';
import type { auth } from '@/lib/auth';

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/two-factor';
      },
    }),
    adminClient(),
    // Types `user.isSystemOwner` on the client session.
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
