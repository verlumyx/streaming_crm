'use client';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { authErrorMessage } from '@/app/(auth)/_lib/auth-error-message';
import { authClient } from '@/lib/auth-client';

const OTP_LENGTH = 6;
const DASHBOARD_URL = '/dashboard';

type Mode = 'totp' | 'recovery';

const COPY: Record<Mode, { title: string; description: string; toggleText: string }> = {
  totp: {
    title: 'Código de verificación',
    description: 'Ingresa el código de 6 dígitos que muestra tu aplicación de autenticación.',
    toggleText: 'usar un código de recuperación',
  },
  recovery: {
    title: 'Código de recuperación',
    description: 'Confirma el acceso a tu cuenta con uno de tus códigos de recuperación de emergencia.',
    toggleText: 'usar el código de tu aplicación',
  },
};

export function TwoFactorForm() {
  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copy = COPY[mode];

  function toggleMode() {
    setMode((m) => (m === 'totp' ? 'recovery' : 'totp'));
    setCode('');
    setErrorMessage(null);
  }

  function verify(submittedCode: string) {
    const trimmedCode = submittedCode.trim();
    if (!trimmedCode) return;
    setErrorMessage(null);

    startTransition(async () => {
      const { error } =
        mode === 'totp'
          ? await authClient.twoFactor.verifyTotp({ code: trimmedCode, trustDevice })
          : await authClient.twoFactor.verifyBackupCode({ code: trimmedCode, trustDevice });

      if (error) {
        const message = authErrorMessage(error, 'No pudimos verificar el código. Intenta de nuevo.');
        setErrorMessage(message);
        setCode('');
        toast.error(message);
        return;
      }

      window.location.assign(DASHBOARD_URL);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verify(code);
  }

  const canSubmit = mode === 'totp' ? code.length === OTP_LENGTH : code.trim().length > 0;

  return (
    <>
      <h1>{copy.title}</h1>
      <p className="sub">{copy.description}</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {mode === 'totp' ? (
          <div className={errorMessage ? 'fld invalid' : 'fld'}>
            <div className="otp">
              <InputOTP
                name="code"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={setCode}
                onComplete={verify}
                pattern={REGEXP_ONLY_DIGITS}
                disabled={isPending}
                autoFocus
                aria-label="Código de verificación"
              >
                <InputOTPGroup>
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <span className="err" role="alert">
              {errorMessage}
            </span>
          </div>
        ) : (
          <div className={errorMessage ? 'fld invalid' : 'fld'}>
            <label htmlFor="recovery_code">Código de recuperación</label>
            <div className="ctrl">
              <input
                id="recovery_code"
                className="plain"
                type="text"
                name="recovery_code"
                placeholder="xxxxx-xxxxx"
                autoComplete="one-time-code"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isPending}
              />
            </div>
            <span className="err" role="alert">
              {errorMessage}
            </span>
          </div>
        )}

        <div className="row-between">
          <label className="check">
            <input
              type="checkbox"
              name="trust_device"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              disabled={isPending}
            />{' '}
            Confiar en este dispositivo por 30 días
          </label>
        </div>

        <button type="submit" className="btn btn-brand btn-block btn-lg" disabled={isPending || !canSubmit}>
          {isPending && <span className="spin" />}
          {isPending ? 'Verificando…' : 'Continuar'}
        </button>
      </form>

      <p className="alt-foot">
        O también puedes{' '}
        <button type="button" className="link" onClick={toggleMode} disabled={isPending}>
          {copy.toggleText}
        </button>
        .
      </p>
    </>
  );
}
