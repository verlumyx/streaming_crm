'use client';

import { ShieldBan, ShieldCheck } from 'lucide-react';
import { HeadingSmall } from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '../hooks/useTwoFactorAuth';
import { TwoFactorPasswordDialog } from './TwoFactorPasswordDialog';
import { TwoFactorRecoveryCodes } from './TwoFactorRecoveryCodes';
import { TwoFactorSetupDialog } from './TwoFactorSetupDialog';

export function TwoFactorSettings({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  const twoFactor = useTwoFactorAuth();

  return (
    <div className="space-y-6">
      <HeadingSmall
        title="Autenticación de dos factores"
        description="Administra la configuración de autenticación de dos factores"
      />

      {twoFactorEnabled ? (
        <div className="flex flex-col items-start justify-start space-y-4">
          <Badge variant="default">Activada</Badge>
          <p className="text-muted-foreground">
            Con la autenticación de dos factores activada, se te pedirá un PIN seguro y aleatorio al iniciar sesión,
            el cual puedes obtener desde una aplicación compatible con TOTP en tu teléfono.
          </p>

          <TwoFactorRecoveryCodes
            codes={twoFactor.recoveryCodes}
            pending={twoFactor.pending}
            onRegenerate={() => twoFactor.requestPassword('regenerate')}
          />

          <Button variant="destructive" onClick={() => twoFactor.requestPassword('disable')} disabled={twoFactor.pending}>
            <ShieldBan /> Desactivar 2FA
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start justify-start space-y-4">
          <Badge variant="destructive">Desactivada</Badge>
          <p className="text-muted-foreground">
            Al activar la autenticación de dos factores, se te solicitará un PIN seguro al iniciar sesión. Puedes
            obtenerlo desde una aplicación compatible con TOTP en tu teléfono.
          </p>

          {twoFactor.setupData ? (
            <Button onClick={twoFactor.openSetup}>
              <ShieldCheck /> Continuar configuración
            </Button>
          ) : (
            <Button onClick={() => twoFactor.requestPassword('enable')} disabled={twoFactor.pending}>
              <ShieldCheck /> Activar 2FA
            </Button>
          )}
        </div>
      )}

      <TwoFactorPasswordDialog
        mode={twoFactor.passwordMode}
        pending={twoFactor.pending}
        error={twoFactor.passwordError}
        onConfirm={twoFactor.confirmPassword}
        onClose={twoFactor.closePasswordDialog}
      />

      <TwoFactorSetupDialog
        open={twoFactor.isSetupOpen}
        step={twoFactor.setupStep}
        setupData={twoFactor.setupData}
        recoveryCodes={twoFactor.recoveryCodes}
        pending={twoFactor.pending}
        verifyError={twoFactor.verifyError}
        onContinue={twoFactor.goToVerifyStep}
        onBack={twoFactor.goToSetupStep}
        onVerify={twoFactor.verifyCode}
        onClose={twoFactor.closeSetup}
      />
    </div>
  );
}
