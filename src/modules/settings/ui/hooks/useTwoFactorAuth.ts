'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { settingsAuthErrorMessage } from '@/modules/settings/validation/auth-error-messages';
import { totpUriSchema, type TotpSetupData } from '@/modules/settings/validation/totp-uri.schema';
import type { TwoFactorPasswordMode, TwoFactorSetupStep } from '../types/Settings';

export const OTP_MAX_LENGTH = 6;

/**
 * better-auth TOTP flow:
 * password → `twoFactor.enable` (secret URI + backup codes, not active yet) →
 * `twoFactor.verifyTotp` (activates it) → show the recovery codes.
 */
export function useTwoFactorAuth() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [passwordMode, setPasswordMode] = useState<TwoFactorPasswordMode | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<TwoFactorSetupStep>('setup');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const requestPassword = (mode: TwoFactorPasswordMode) => {
    setPasswordError(null);
    setPasswordMode(mode);
  };

  const closePasswordDialog = () => {
    if (pending) return;
    setPasswordMode(null);
    setPasswordError(null);
  };

  const confirmPassword = (password: string) => {
    if (!passwordMode || !password) return;
    const mode = passwordMode;
    setPasswordError(null);

    startTransition(async () => {
      if (mode === 'enable') {
        const { data, error } = await authClient.twoFactor.enable({ password });
        const parsedUri = data && 'totpURI' in data ? totpUriSchema.safeParse(data.totpURI) : null;
        if (error || !parsedUri?.success) {
          setPasswordError(settingsAuthErrorMessage(error, 'No pudimos iniciar la configuración. Intenta de nuevo.'));
          return;
        }
        setSetupData(parsedUri.data);
        setRecoveryCodes(data && 'backupCodes' in data ? (data.backupCodes ?? []) : []);
        setSetupStep('setup');
        setVerifyError(null);
        setPasswordMode(null);
        setIsSetupOpen(true);
        return;
      }

      if (mode === 'disable') {
        const { error } = await authClient.twoFactor.disable({ password });
        if (error) {
          setPasswordError(settingsAuthErrorMessage(error, 'No pudimos desactivar la autenticación. Intenta de nuevo.'));
          return;
        }
        setPasswordMode(null);
        setSetupData(null);
        setRecoveryCodes([]);
        toast.success('Autenticación de dos factores desactivada.');
        router.refresh();
        return;
      }

      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error || !data) {
        setPasswordError(settingsAuthErrorMessage(error, 'No pudimos regenerar los códigos. Intenta de nuevo.'));
        return;
      }
      setRecoveryCodes(data.backupCodes);
      setPasswordMode(null);
      toast.success('Códigos de recuperación regenerados.');
    });
  };

  const verifyCode = (code: string) => {
    if (code.length < OTP_MAX_LENGTH) return;
    setVerifyError(null);

    startTransition(async () => {
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) {
        setVerifyError(settingsAuthErrorMessage(error, 'No pudimos verificar el código. Intenta de nuevo.'));
        return;
      }
      setSetupStep('codes');
      router.refresh();
    });
  };

  const closeSetup = () => {
    if (pending) return;
    setIsSetupOpen(false);
    // Once verified the secret is no longer needed; before that, keep it to "Continuar configuración".
    if (setupStep === 'codes') setSetupData(null);
    setSetupStep('setup');
    setVerifyError(null);
  };

  return {
    pending,
    passwordMode,
    passwordError,
    requestPassword,
    closePasswordDialog,
    confirmPassword,
    setupData,
    isSetupOpen,
    openSetup: () => setIsSetupOpen(true),
    setupStep,
    goToVerifyStep: () => setSetupStep('verify'),
    goToSetupStep: () => {
      setVerifyError(null);
      setSetupStep('setup');
    },
    verifyError,
    verifyCode,
    closeSetup,
    recoveryCodes,
  };
}
