'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { addDays, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { renewAccountAction } from '@/app/[companyId]/accounts/actions';
import type { AccountDto } from '@/modules/account/serializers/account.serializer';

type AccountRef = Pick<AccountDto, 'id' | 'code' | 'nextRenewal'>;

type Props = {
  companyId: string;
  /** Account to renew; the dialog is open while it is not null. */
  account: AccountRef | null;
  onClose: () => void;
};

/** Registrar renovación: reusable from the list and the detail page. */
export function AccountRenewDialog({ companyId, account, onClose }: Props) {
  return (
    <Dialog open={account !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {account && <RenewForm key={account.id} companyId={companyId} account={account} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RenewForm({ companyId, account, onClose }: { companyId: string; account: AccountRef; onClose: () => void }) {
  const [id] = useState(() => uuidv7());
  const [amount, setAmount] = useState(0);
  const [nextRenewal, setNextRenewal] = useState(() => addDays(account.nextRenewal, 30));
  const [notes, setNotes] = useState('');

  const [state, formAction, pending] = useActionState(
    renewAccountAction.bind(null, companyId, account.id),
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  // The action redirects on success: close once the submit settles without an error.
  const submitted = useRef(false);
  useEffect(() => {
    if (pending) {
      submitted.current = true;
      return;
    }
    if (!submitted.current) return;
    submitted.current = false;
    if (state.status === 'error') {
      if (state.message && !state.fieldErrors) toast.error(state.message);
      return;
    }
    onClose();
  }, [pending, state, onClose]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="amount" value={String(amount)} />

      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-2">
          <RefreshCw className="text-muted-foreground size-4" />
          Registrar renovación
        </DialogTitle>
        <DialogDescription>
          {account.code} · vencimiento actual: {formatDate(account.nextRenewal)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-amount">Monto *</Label>
          <CurrencyInput
            id="renew-amount"
            min={0}
            decimals={2}
            value={amount}
            onValueChange={setAmount}
            className={cn('h-[42px] rounded-[10px]', errors.amount && 'border-bad')}
            required
          />
          {errors.amount?.[0] && <p className="text-bad text-sm">{errors.amount[0]}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-next-renewal">Nueva fecha de vencimiento *</Label>
          <Input
            id="renew-next-renewal"
            name="nextRenewal"
            type="date"
            min={addDays(account.nextRenewal, 1)}
            value={nextRenewal}
            onChange={(e) => setNextRenewal(e.target.value)}
            className={cn('h-[42px] rounded-[10px]', errors.nextRenewal && 'border-bad')}
            required
          />
          {errors.nextRenewal?.[0] && <p className="text-bad text-sm">{errors.nextRenewal[0]}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="renew-notes">Notas</Label>
          <Textarea
            id="renew-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-[10px]"
          />
          {errors.notes?.[0] && <p className="text-bad text-sm">{errors.notes[0]}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="bg-card rounded-[10px] font-semibold" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" className="rounded-[10px] font-semibold" disabled={pending}>
          {pending ? 'Registrando…' : 'Registrar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
