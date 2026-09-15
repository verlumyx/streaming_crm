'use client';

import { useActionState, useState } from 'react';
import { AlertTriangle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { cancelSaleAction } from '@/app/[companyId]/sales/actions';

/** Minimal sale shape the dialog needs (`SaleDto` satisfies it). */
export type SaleCancelTarget = { id: string; code: string; price: number; client?: { name: string } | null };

export interface SaleCancelDialogProps {
  companyId: string;
  /** Sale to expel; the dialog is open while it is not `null`. */
  sale: SaleCancelTarget | null;
  onClose: () => void;
  /** Same-company path to land on afterwards (defaults to the sale detail page). */
  returnTo?: string;
}

/** Expulsar: cancels the sale, frees its profiles and optionally requests a pending refund. */
export function SaleCancelDialog({ companyId, sale, onClose, returnTo }: SaleCancelDialogProps) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      {sale && (
        <DialogContent className="sm:max-w-md">
          <SaleCancelForm key={sale.id} companyId={companyId} sale={sale} onClose={onClose} returnTo={returnTo} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function SaleCancelForm({ companyId, sale, onClose, returnTo }: SaleCancelDialogProps & { sale: SaleCancelTarget }) {
  const [createRefund, setCreateRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState(sale.price);
  const [state, formAction, pending] = useActionState(
    cancelSaleAction.bind(null, companyId, sale.id),
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {createRefund && <input type="hidden" name="createRefund" value="true" />}
      {createRefund && <input type="hidden" name="refundAmount" value={refundAmount} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-2">
          <Ban className="text-muted-foreground size-4" />
          Expulsar venta
        </DialogTitle>
        <DialogDescription>
          {sale.code} · {sale.client?.name ?? '—'}. Los perfiles quedarán disponibles.
        </DialogDescription>
      </DialogHeader>

      {state.status === 'error' && state.message && (
        <div className="border-bad/40 bg-bad-soft text-bad flex items-start gap-2 rounded-[10px] border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.id?.[0] ?? state.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cancel-reason">Motivo *</Label>
        <Textarea
          id="cancel-reason"
          name="cancellationReason"
          rows={3}
          maxLength={255}
          required
          className={cn('rounded-[10px]', errors.cancellationReason && 'border-bad')}
        />
        {errors.cancellationReason && <p className="text-bad text-sm">{errors.cancellationReason[0]}</p>}
      </div>

      <label className="bg-card flex cursor-pointer items-center gap-2.5 rounded-[10px] border p-3">
        <Checkbox checked={createRefund} onCheckedChange={(checked) => setCreateRefund(checked === true)} />
        <span className="text-sm font-semibold">Crear reembolso</span>
      </label>

      {createRefund && (
        <div className="flex flex-col gap-4 rounded-[10px] border border-dashed p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-amount">Monto a reembolsar *</Label>
            <CurrencyInput
              id="refund-amount"
              min={0}
              decimals={2}
              value={refundAmount}
              onValueChange={setRefundAmount}
              className={cn('h-[42px] rounded-[10px]', errors.refundAmount && 'border-bad')}
            />
            {errors.refundAmount && <p className="text-bad text-sm">{errors.refundAmount[0]}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-reason">Razón del reembolso</Label>
            <Textarea
              id="refund-reason"
              name="refundReason"
              rows={2}
              maxLength={255}
              className={cn('rounded-[10px]', errors.refundReason && 'border-bad')}
              placeholder="Por defecto se usa el motivo de la expulsión"
            />
            {errors.refundReason && <p className="text-bad text-sm">{errors.refundReason[0]}</p>}
          </div>
          <p className="text-muted-foreground text-[12.5px]">
            El reembolso quedará pendiente de aprobación. El egreso se registra al aprobarlo.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" className="bg-card rounded-[10px] font-semibold" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" className="rounded-[10px] font-semibold" disabled={pending}>
          {pending ? 'Expulsando…' : 'Expulsar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
