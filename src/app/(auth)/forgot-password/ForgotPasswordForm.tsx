'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MailIcon, MailSentIcon } from '@/app/(auth)/_components/AuthIcons';
import { authErrorMessage } from '@/app/(auth)/_lib/auth-error-message';
import { authClient } from '@/lib/auth-client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });

      if (error) {
        const message = authErrorMessage(error, 'No pudimos enviar el enlace. Intenta de nuevo.');
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      setIsSent(true);
    });
  }

  if (isSent) {
    return (
      <div className="sent">
        <div className="big-ico">
          <MailSentIcon />
        </div>
        <h1>Revisa tu correo</h1>
        <p className="sub">
          Te enviamos un enlace de recuperación si el correo está registrado. Revisa tu bandeja de
          entrada (y la carpeta de spam) — tiene una validez de 60 minutos.
        </p>
        <Link className="btn btn-ghost btn-block" href="/login" style={{ marginTop: 26 }}>
          Volver a iniciar sesión
        </Link>
        <p className="resend">
          ¿No te llegó? Revisa spam o{' '}
          <button type="button" className="link" onClick={() => setIsSent(false)}>
            prueba con otro correo
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="auth-icon">
        <MailIcon strokeWidth={1.7} />
      </div>
      <h1>¿Olvidaste tu contraseña?</h1>
      <p className="sub">
        No hay problema. Escribe el correo de tu cuenta y te enviaremos un enlace para restablecerla.
      </p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className={errorMessage ? 'fld invalid' : 'fld'}>
          <label htmlFor="email">Correo electrónico</label>
          <div className="ctrl">
            <MailIcon className="lead" />
            <input
              id="email"
              type="email"
              name="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>
          <span className="err" role="alert">
            {errorMessage}
          </span>
        </div>
        <button
          type="submit"
          className="btn btn-brand btn-block btn-lg"
          disabled={isPending || !email}
          data-test="email-password-reset-link-button"
        >
          {isPending && <span className="spin" />}
          {isPending ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </button>
      </form>

      <p className="alt-foot">
        ¿Recordaste tu contraseña? <Link href="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
