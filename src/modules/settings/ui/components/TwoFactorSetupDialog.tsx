'use client';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { ScanLine } from 'lucide-react';
import { useState } from 'react';
import { InputError } from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import type { TotpSetupData } from '@/modules/settings/validation/totp-uri.schema';
import { OTP_MAX_LENGTH } from '../hooks/useTwoFactorAuth';
import type { TwoFactorSetupStep } from '../types/Settings';
import { CopyableValue } from './CopyableValue';
import { TwoFactorRecoveryCodes } from './TwoFactorRecoveryCodes';

const COPY: Record<TwoFactorSetupStep, { title: string; description: string }> = {
  setup: {
    title: 'Activar autenticación de dos factores',
    description:
      'Para terminar de activar la autenticación de dos factores, agrega esta clave en tu aplicación de autenticación.',
  },
  verify: {
    title: 'Verificar código de autenticación',
    description: 'Ingresa el código de 6 dígitos de tu aplicación de autenticación.',
  },
  codes: {
    title: 'Autenticación de dos factores activada',
    description: 'Guarda tus códigos de recuperación en un lugar seguro antes de cerrar esta ventana.',
  },
};

type Props = {
  open: boolean;
  step: TwoFactorSetupStep;
  setupData: TotpSetupData | null;
  recoveryCodes: string[];
  pending: boolean;
  verifyError: string | null;
  onContinue: () => void;
  onBack: () => void;
  onVerify: (code: string) => void;
  onClose: () => void;
};

export function TwoFactorSetupDialog({
  open,
  step,
  setupData,
  recoveryCodes,
  pending,
  verifyError,
  onContinue,
  onBack,
  onVerify,
  onClose,
}: Props) {
  const copy = COPY[step];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex items-center justify-center">
          <div className="border-border bg-muted mb-3 rounded-full border p-2.5">
            <ScanLine className="text-foreground size-6" />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="text-center">{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-5">
          {step === 'setup' && setupData && (
            <>
              <div className="w-full space-y-2">
                <p className="text-sm font-medium">Clave de configuración</p>
                <CopyableValue value={setupData.secret} label="Clave de configuración" />
                {setupData.account && (
                  <p className="text-muted-foreground text-xs">
                    Cuenta: {setupData.account}
                    {setupData.issuer ? ` · Emisor: ${setupData.issuer}` : ''} · Tipo: basada en tiempo (TOTP)
                  </p>
                )}
              </div>

              <div className="w-full space-y-2">
                <p className="text-sm font-medium">Enlace otpauth</p>
                <CopyableValue value={setupData.uri} label="Enlace otpauth" multiline />
                <p className="text-muted-foreground text-xs">
                  Pega el enlace en una aplicación compatible o ingresa la clave manualmente.
                </p>
              </div>

              <Button className="w-full" onClick={onContinue}>
                Continuar
              </Button>
            </>
          )}

          {step === 'verify' && (
            <TwoFactorVerificationStep pending={pending} error={verifyError} onBack={onBack} onVerify={onVerify} />
          )}

          {step === 'codes' && (
            <>
              <TwoFactorRecoveryCodes codes={recoveryCodes} initiallyVisible />
              <Button className="w-full" onClick={onClose}>
                Cerrar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TwoFactorVerificationStep({
  pending,
  error,
  onBack,
  onVerify,
}: {
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onVerify: (code: string) => void;
}) {
  const [code, setCode] = useState('');

  return (
    <form
      className="w-full space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onVerify(code);
        setCode('');
      }}
    >
      <div className="flex w-full flex-col items-center space-y-3 py-2">
        <InputOTP
          id="otp"
          name="code"
          maxLength={OTP_MAX_LENGTH}
          value={code}
          onChange={setCode}
          disabled={pending}
          pattern={REGEXP_ONLY_DIGITS}
          autoFocus
          aria-label="Código de verificación"
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_MAX_LENGTH }, (_, index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <InputError message={error ?? undefined} />
      </div>

      <div className="flex w-full space-x-5">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button type="submit" className="flex-1" disabled={pending || code.length < OTP_MAX_LENGTH}>
          {pending ? 'Verificando…' : 'Confirmar'}
        </Button>
      </div>
    </form>
  );
}
