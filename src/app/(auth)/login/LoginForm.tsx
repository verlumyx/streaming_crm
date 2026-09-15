'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MailIcon } from '@/app/(auth)/_components/AuthIcons';
import { SUPPORT_EMAIL } from '@/app/(auth)/_components/AuthShell';
import { PasswordInput } from '@/app/(auth)/_components/PasswordInput';
import { authErrorMessage } from '@/app/(auth)/_lib/auth-error-message';
import { checkLoginEligibilityAction } from '@/app/(auth)/login/actions';
import { authClient } from '@/lib/auth-client';

const DASHBOARD_URL = '/dashboard';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const eligibility = await checkLoginEligibilityAction(email);
      if (!eligibility.ok) {
        setErrorMessage(eligibility.message);
        toast.error(eligibility.message);
        return;
      }

      const { data, error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: DASHBOARD_URL,
      });

      if (error) {
        const message = authErrorMessage(error, 'No pudimos iniciar sesión. Intenta de nuevo.');
        setErrorMessage(message);
        setPassword('');
        toast.error(message);
        return;
      }

      // 2FA-enabled accounts: the twoFactorClient plugin already redirected to /two-factor.
      if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) return;

      window.location.assign(DASHBOARD_URL);
    });
  }

  return (
    <>
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

        <div className="fld">
          <div className="row-between">
            <label htmlFor="password">Contraseña</label>
            <Link className="link" href="/forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="row-between">
          <label className="check">
            <input
              type="checkbox"
              name="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isPending}
            />{' '}
            Mantener sesión iniciada
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-brand btn-block btn-lg"
          disabled={isPending || !email || !password}
          data-test="login-button"
        >
          {isPending && <span className="spin" />}
          {isPending ? 'Entrando…' : 'Entrar a mi panel'}
        </button>
      </form>

      <p className="alt-foot">
        ¿Problemas para entrar? <a href={`mailto:${SUPPORT_EMAIL}`}>Escríbenos</a>
      </p>
    </>
  );
}
