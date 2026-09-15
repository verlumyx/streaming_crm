'use client';

import { Check, Copy, Eye, EyeOff, LockKeyhole, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClipboard } from '@/hooks/use-clipboard';

type Props = {
  codes: string[];
  pending?: boolean;
  /** Omitted in the setup dialog, where the codes were just generated. */
  onRegenerate?: () => void;
  initiallyVisible?: boolean;
};

export function TwoFactorRecoveryCodes({ codes, pending = false, onRegenerate, initiallyVisible = false }: Props) {
  const [codesAreVisible, setCodesAreVisible] = useState(initiallyVisible);
  const [copiedText, copy] = useClipboard();
  const allCodes = codes.join('\n');
  const CopyIcon = copiedText === allCodes ? Check : Copy;
  const VisibilityIcon = codesAreVisible ? EyeOff : Eye;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex gap-3">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Códigos de recuperación
        </CardTitle>
        <CardDescription>
          Los códigos de recuperación te permiten recuperar el acceso si pierdes tu dispositivo de 2FA. Guárdalos
          en un gestor de contraseñas seguro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {codes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Por seguridad, los códigos existentes no se pueden volver a mostrar. Regenera un nuevo juego de códigos
            para verlos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setCodesAreVisible((v) => !v)}
              aria-expanded={codesAreVisible}
              aria-controls="recovery-codes-section"
            >
              <VisibilityIcon className="size-4" aria-hidden="true" />
              {codesAreVisible ? 'Ocultar códigos' : 'Ver códigos'}
            </Button>
            {codesAreVisible && (
              <Button type="button" variant="outline" onClick={() => copy(allCodes)}>
                <CopyIcon className="size-4" aria-hidden="true" />
                Copiar códigos
              </Button>
            )}
          </div>
        )}

        {codes.length > 0 && codesAreVisible && (
          <div id="recovery-codes-section" className="space-y-3">
            <div
              className="bg-muted grid gap-1 rounded-lg p-4 font-mono text-sm sm:grid-cols-2"
              role="list"
              aria-label="Códigos de recuperación"
            >
              {codes.map((code) => (
                <div key={code} role="listitem" className="select-text">
                  {code}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Cada código de recuperación puede usarse una sola vez para acceder a tu cuenta.
            </p>
          </div>
        )}

        {onRegenerate && (
          <Button type="button" variant="secondary" onClick={onRegenerate} disabled={pending}>
            <RefreshCw /> Regenerar códigos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
