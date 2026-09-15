'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { authErrorMessage } from '@/app/(auth)/_lib/auth-error-message';
import { authClient } from '@/lib/auth-client';
import { signOutAction } from '@/modules/shared/auth/sign-out.action';

export function VerifyEmailForm({ email }: { email: string }) {
  const [isSent, setIsSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' });

      if (error) {
        toast.error(authErrorMessage(error, 'No pudimos reenviar el correo. Intenta de nuevo.'));
        return;
      }

      setIsSent(true);
      toast.success('Te enviamos un nuevo enlace de verificación.');
    });
  }

  return (
    <div className="form">
      {isSent && (
        <div className="auth-status ok" role="status">
          Enviamos un nuevo enlace de verificación a tu correo.
        </div>
      )}

      <button type="button" className="btn btn-brand btn-block btn-lg" onClick={resend} disabled={isPending}>
        {isPending && <span className="spin" />}
        {isPending ? 'Enviando…' : 'Reenviar correo de verificación'}
      </button>

      <form action={signOutAction}>
        <button type="submit" className="btn btn-ghost btn-block" disabled={isPending}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
