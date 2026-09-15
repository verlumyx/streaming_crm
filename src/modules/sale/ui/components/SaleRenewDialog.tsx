'use client';

import { useActionState, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { renewSaleAction } from '@/app/[companyId]/sales/actions';

/** Minimal sale shape the dialog needs (`SaleDto` satisfies it). */
export type SaleRenewTarget = {
  id: string;
  code: string;
  endDate: string;
  /** Snapshot values, used when the plan is missing. */
  durationDays: number;
  price: number;
  /** Current plan values: pre-fill duration and price. */
  plan?: { durationDays: number; salePrice: number } | null;
};

export interface SaleRenewDialogProps {
  companyId: string;
  /** Sale to renew; the dialog is open while it is not `null`. */
  sale: SaleRenewTarget | null;
  onClose: () => void;
  /** Same-company path to land on after renewing (defaults to the sale detail page). */
  returnTo?: string;
}

/**
 * Renovar (active or in-grace sales). Posts to `renewSaleAction`, which records the renewal, moves the end date
 * and writes the ledger income. Reusable from other modules (e.g. the expirations report).
 */
export function SaleRenewDialog({ companyId, sale, onClose, returnTo }: SaleRenewDialogProps) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      {sale && (
        <DialogContent className="sm:max-w-md">
          <SaleRenewForm key={sale.id} companyId={companyId} sale={sale} onClose={onClose} returnTo={returnTo} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function SaleRenewForm({ companyId, sale, onClose, returnTo }: SaleRenewDialogProps & { sale: SaleRenewTarget }) {
  const [renewalId] = useState(uuidv7);
  const [durationDays, setDurationDays] = useState(sale.plan?.durationDays ?? sale.durationDays);
  const [price, setPrice] = useState(sale.plan?.salePrice ?? sale.price);
  const [state, formAction, pending] = useActionState(
    renewSaleAction.bind(null, companyId, sale.id),
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={renewalId} />
      <input type="hidden" name="durationDays" value={durationDays} />
      <input type="hidden" name="price" value={price} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-2">
          <RefreshCw className="text-muted-foreground size-4" />
          Renovar venta
        </DialogTitle>
        <DialogDescription>
          {sale.code} · vencimiento actual: {formatDate(sale.endDate)}
        </DialogDescription>
      </DialogHeader>

      {state.status === 'error' && state.message && (
        <div className="border-bad/40 bg-bad-soft text-bad flex items-start gap-2 rounded-[10px] border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.id?.[0] ?? state.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renew-duration">Duración (días)</Label>
        <NumberInput
          id="renew-duration"
          min={1}
          decimals={0}
          value={durationDays}
          onValueChange={setDurationDays}
          className={cn('h-[42px] rounded-[10px]', errors.durationDays && 'border-bad')}
        />
        {errors.durationDays && <p className="text-bad text-sm">{errors.durationDays[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renew-price">Precio</Label>
        <CurrencyInput
          id="renew-price"
          min={0}
          decimals={2}
          value={price}
          onValueChange={setPrice}
          className={cn('h-[42px] rounded-[10px]', errors.price && 'border-bad')}
        />
        {errors.price && <p className="text-bad text-sm">{errors.price[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renew-notes">Notas</Label>
        <Textarea id="renew-notes" name="notes" rows={3} className="rounded-[10px]" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="bg-card rounded-[10px] font-semibold" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="rounded-[10px] font-semibold" disabled={pending}>
          {pending ? 'Renovando…' : 'Renovar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
