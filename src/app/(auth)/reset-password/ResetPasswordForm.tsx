'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CheckIcon } from '@/app/(auth)/_components/AuthIcons';
import { PasswordInput } from '@/app/(auth)/_components/PasswordInput';
import { authErrorMessage } from '@/app/(auth)/_lib/auth-error-message';
import { authClient } from '@/lib/auth-client';

const REQUIREMENTS = [
  { key: 'len', label: 'Al menos 8 caracteres', test: (v: string) => v.length >= 8 },
  { key: 'upper', label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'num', label: 'Un número', test: (v: string) => /[0-9]/.test(v) },
  { key: 'sym', label: 'Un símbolo (!?@#…)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const STRENGTH_LABELS = ['', 'Débil', 'Aceptable', 'Buena', 'Excelente'];

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const requirementsMet = useMemo(
    () => REQUIREMENTS.map((r) => ({ key: r.key, ok: r.test(password) })),
    [password],
  );
  const score = requirementsMet.filter((m) => m.ok).length;
  const isMismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = password.length >= 8 && confirmation === password && !isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (password !== confirmation) return;

    startTransition(async () => {
      const { error } = await authClient.resetPassword({ newPassword: password, token });

      if (error) {
        const message = authErrorMessage(error, 'No pudimos guardar la contraseña. Intenta de nuevo.');
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      toast.success('Contraseña actualizada. Ya puedes iniciar sesión.');
      router.push('/login?status=reset');
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className={errorMessage ? 'fld invalid' : 'fld'}>
        <label htmlFor="password">Nueva contraseña</label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="••••••••"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
        <div className={`strength s${password ? score : 0}`}>
          <div className="strength-bars">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="strength-txt">
          {password
            ? `Seguridad: ${STRENGTH_LABELS[score]}`
            : 'Usa 8+ caracteres con mayúsculas, números y símbolos'}
        </div>
        <span className="err" role="alert">
          {errorMessage}
        </span>
      </div>

      <div className={isMismatch ? 'fld invalid' : 'fld'}>
        <label htmlFor="password_confirmation">Confirmar contraseña</label>
        <PasswordInput
          id="password_confirmation"
          name="password_confirmation"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={isPending}
        />
        <span className="err">Las contraseñas no coinciden</span>
      </div>

      <ul className="reqs">
        {REQUIREMENTS.map((r) => (
          <li key={r.key} className={requirementsMet.find((m) => m.key === r.key)?.ok ? 'met' : undefined}>
            <span className="rk">
              <CheckIcon />
            </span>{' '}
            {r.label}
          </li>
        ))}
      </ul>

      <button
        type="submit"
        className="btn btn-brand btn-block btn-lg"
        disabled={!canSubmit}
        data-test="reset-password-button"
      >
        {isPending && <span className="spin" />}
        {isPending ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
