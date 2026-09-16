'use client';

import { useActionState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { rejectSaleAction } from '@/app/[companyId]/sales/actions';

/** Minimal sale shape the dialog needs (`SaleDto` satisfies it). */
export type SaleRejectTarget = { id: string; code: string; client?: { name: string } | null };

export interface SaleRejectDialogProps {
  companyId: string;
  /** Pending sale to reject; the dialog is open while it is not `null`. */
  sale: SaleRejectTarget | null;
  onClose: () => void;
  /** Same-company path to land on afterwards (defaults to the sale detail page). */
  returnTo?: string;
}

/** Rechazar: the payment of a pending sale was not verified. */
export function SaleRejectDialog({ companyId, sale, onClose, returnTo }: SaleRejectDialogProps) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      {sale && (
        <DialogContent className="sm:max-w-md">
          <SaleRejectForm key={sale.id} companyId={companyId} sale={sale} onClose={onClose} returnTo={returnTo} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function SaleRejectForm({ companyId, sale, onClose, returnTo }: SaleRejectDialogProps & { sale: SaleRejectTarget }) {
  const [state, formAction, pending] = useActionState(
    rejectSaleAction.bind(null, companyId, sale.id),
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-2">
          <X className="text-muted-foreground size-4" />
          Rechazar venta
        </DialogTitle>
        <DialogDescription>
          {sale.code} · {sale.client?.name ?? '—'}. No se registrará ningún movimiento y no podrá aprobarse después.
        </DialogDescription>
      </DialogHeader>

      {state.status === 'error' && state.message && (
        <div className="border-bad/40 bg-bad-soft text-bad flex items-start gap-2 rounded-[10px] border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.id?.[0] ?? state.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reject-reason">Motivo *</Label>
        <Textarea
          id="reject-reason"
          name="rejectionReason"
          rows={3}
          maxLength={255}
          required
          placeholder="Ej. El pago no se reflejó en la cuenta"
          className={cn('rounded-[10px]', errors.rejectionReason && 'border-bad')}
        />
        {errors.rejectionReason && <p className="text-bad text-sm">{errors.rejectionReason[0]}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="bg-card rounded-[10px] font-semibold" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" className="rounded-[10px] font-semibold" disabled={pending}>
          {pending ? 'Rechazando…' : 'Rechazar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
