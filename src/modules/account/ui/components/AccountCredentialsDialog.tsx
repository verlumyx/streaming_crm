'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AccountDto } from '@/modules/account/serializers/account.serializer';
import { useAccountCredentials } from '../hooks/useAccountCredentials';

type AccountRef = Pick<AccountDto, 'id' | 'code' | 'email'>;

type Props = { companyId: string; account: AccountRef | null; onClose: () => void };

/** Credentials modal of the list: loads as soon as it opens. */
export function AccountCredentialsDialog({ companyId, account, onClose }: Props) {
  return (
    <Dialog open={account !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <KeyRound className="text-muted-foreground size-4" />
            Credenciales
          </DialogTitle>
          <DialogDescription>{account ? `${account.code} · ${account.email}` : 'Credenciales de la cuenta'}</DialogDescription>
        </DialogHeader>
        {account && <CredentialsBody key={account.id} companyId={companyId} accountId={account.id} />}
      </DialogContent>
    </Dialog>
  );
}

function CredentialsBody({ companyId, accountId }: { companyId: string; accountId: string }) {
  const { loading, error, credentials, load, copied, copyCredentials } = useAccountCredentials(companyId, accountId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    load(() => setVisible(true));
    // Load once per opened account (the body is keyed by account id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {loading && (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Obteniendo credenciales…
        </div>
      )}

      {error && <p className="text-bad py-2 text-sm">{error}</p>}

      {credentials && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="text-muted-foreground font-medium">Email</span>
            <b className="font-bold break-all select-all">{credentials.email}</b>
          </div>
          <div className="border-input flex items-center justify-between gap-3 border-t border-dashed pt-2.5 text-[13.5px]">
            <span className="text-muted-foreground font-medium">Contraseña</span>
            <b className="font-mono font-bold break-all select-all">{visible ? credentials.password : '••••••••'}</b>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="bg-card rounded-[10px] font-semibold" onClick={copyCredentials}>
              {copied ? <Check className="text-ok size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="outline" size="sm" className="bg-card rounded-[10px] font-semibold" onClick={() => setVisible((v) => !v)}>
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {visible ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
