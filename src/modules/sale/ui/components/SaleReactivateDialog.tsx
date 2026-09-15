'use client';

import { useActionState, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
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
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { initialActionState, type ActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { reactivateSaleAction } from '@/app/[companyId]/sales/actions';
import type { SaleAvailableProfileDto } from '@/modules/sale/serializers/sale.serializer';
import { unavailableProfilesOf, type SaleUnavailableProfile } from '../types/Sale';

export type SaleReactivateTarget = {
  id: string;
  code: string;
  serviceId: string;
  durationDays: number;
  price: number;
  client?: { name: string } | null;
};

interface SaleReactivateDialogProps {
  companyId: string;
  /** Sale to reactivate; the dialog is open while it is not `null`. */
  sale: SaleReactivateTarget | null;
  /** Available profiles of the sale's service, offered as replacements after a conflict. */
  availableProfiles: SaleAvailableProfileDto[];
  /** Profiles the replacement must pick. */
  requiredCount: number;
  onClose: () => void;
}

/**
 * Reactivar (cancelled or expired beyond grace). First tries the current profiles; when the action answers
 * `conflict`, lists the taken ones and asks for exactly `requiredCount` replacements of the same service.
 */
export function SaleReactivateDialog({ sale, onClose, ...rest }: SaleReactivateDialogProps) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      {sale && (
        <DialogContent className="sm:max-w-lg">
          <SaleReactivateForm key={sale.id} sale={sale} onClose={onClose} {...rest} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function SaleReactivateForm({
  companyId,
  sale,
  availableProfiles,
  requiredCount,
  onClose,
}: SaleReactivateDialogProps & { sale: SaleReactivateTarget }) {
  const [renewalId] = useState(uuidv7);
  const [durationDays, setDurationDays] = useState(sale.durationDays);
  const [price, setPrice] = useState(sale.price);
  const [selected, setSelected] = useState<string[]>([]);
  const [conflict, setConflict] = useState<SaleUnavailableProfile[] | null>(null);
  const [state, formAction, pending] = useActionState(
    reactivateSaleAction.bind(null, companyId, sale.id),
    initialActionState,
  );

  // A conflict switches the dialog to replacement mode (kept until the dialog closes).
  const [handledState, setHandledState] = useState<ActionState>(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === 'conflict') {
      const taken = unavailableProfilesOf(state.details);
      setConflict(taken);
      setSelected((prev) => prev.filter((id) => !taken.some((p) => p.id === id)));
    }
  }

  const takenIds = new Set((conflict ?? []).map((p) => p.id));
  const candidates = availableProfiles.filter((p) => p.serviceId === sale.serviceId && !takenIds.has(p.id));
  const canSubmit = conflict ? selected.length === requiredCount : true;
  const errorMessage =
    state.status === 'conflict' || state.status === 'error'
      ? (Object.values(state.fieldErrors ?? {}).flat()[0] ?? state.message)
      : null;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={renewalId} />
      <input type="hidden" name="durationDays" value={durationDays} />
      <input type="hidden" name="price" value={price} />
      {conflict && selected.map((id) => <input key={id} type="hidden" name="profileIds" value={id} />)}

      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-2">
          <RotateCcw className="text-muted-foreground size-4" />
          Reactivar venta
        </DialogTitle>
        <DialogDescription>
          {sale.code} · {sale.client?.name ?? '—'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reactivate-duration">Duración (días)</Label>
          <NumberInput
            id="reactivate-duration"
            min={1}
            decimals={0}
            value={durationDays}
            onValueChange={setDurationDays}
            className="h-[42px] rounded-[10px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reactivate-price">Precio</Label>
          <CurrencyInput
            id="reactivate-price"
            min={0}
            decimals={2}
            value={price}
            onValueChange={setPrice}
            className="h-[42px] rounded-[10px]"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="border-bad/40 bg-bad-soft text-bad flex items-start gap-2 rounded-[10px] border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {conflict && (
        <div className="flex flex-col gap-2">
          {conflict.length > 0 && (
            <p className="text-muted-foreground text-[13px]">
              No disponibles: {conflict.map((p) => p.label).join(', ')}
            </p>
          )}
          <Label>
            Elige {requiredCount} perfil{requiredCount !== 1 ? 'es' : ''} de reemplazo ({selected.length}/
            {requiredCount})
          </Label>
          <div className="flex max-h-48 flex-col gap-1 overflow-auto rounded-[10px] border p-2">
            {candidates.length === 0 && (
              <p className="text-muted-foreground p-2 text-sm">No hay perfiles disponibles para este servicio.</p>
            )}
            {candidates.map((profile) => (
              <label
                key={profile.id}
                className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <Checkbox checked={selected.includes(profile.id)} onCheckedChange={() => toggle(profile.id)} />
                <span className="font-medium">{profile.accountEmail}</span>
                <span className="text-muted-foreground">· Perfil {profile.number}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reactivate-notes">Notas</Label>
        <Textarea id="reactivate-notes" name="notes" rows={2} className="rounded-[10px]" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="bg-card rounded-[10px] font-semibold" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="rounded-[10px] font-semibold" disabled={pending || !canSubmit}>
          {pending ? 'Reactivando…' : 'Reactivar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
