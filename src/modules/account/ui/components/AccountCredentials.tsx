'use client';

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccountCredentials } from '../hooks/useAccountCredentials';

type Props = { companyId: string; accountId: string };

/** "Ver credenciales" card of the detail page: reveal / hide and copy. */
export function AccountCredentials({ companyId, accountId }: Props) {
  const { loading, error, credentials, load, copied, copyCredentials } = useAccountCredentials(companyId, accountId);
  const [visible, setVisible] = useState(false);

  const toggle = () => {
    if (credentials) setVisible((v) => !v);
    else load(() => setVisible(true));
  };

  return (
    <Card className="gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-base font-bold tracking-tight">
          <KeyRound className="text-muted-foreground size-4" />
          Credenciales
        </div>
        <Button variant="outline" size="sm" className="bg-card rounded-[10px] font-semibold" onClick={toggle} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {visible ? 'Ocultar' : 'Ver credenciales'}
        </Button>
      </div>

      {error && <p className="text-bad text-sm">{error}</p>}

      {credentials && visible && (
        <div className="border-input flex flex-col gap-2.5 border-t border-dashed pt-3">
          <div className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="text-muted-foreground font-medium">Email</span>
            <b className="font-bold break-all select-all">{credentials.email}</b>
          </div>
          <div className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="text-muted-foreground font-medium">Contraseña</span>
            <b className="font-mono font-bold break-all select-all">{credentials.password}</b>
          </div>
          <Button variant="outline" size="sm" className="bg-card mt-1 self-end rounded-[10px] font-semibold" onClick={copyCredentials}>
            {copied ? <Check className="text-ok size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}
    </Card>
  );
}
