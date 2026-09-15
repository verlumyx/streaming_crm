'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/modules/shared/auth/sign-out.action';

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => startTransition(() => signOutAction())}>
      Cerrar sesión
    </Button>
  );
}
