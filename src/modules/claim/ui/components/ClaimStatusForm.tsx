'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { CLAIM_STATUSES, type ClaimStatus } from '@/modules/claim/models/claim.model';
import { CLAIM_RESOLUTION_NOTES_MAX } from '@/modules/claim/validation/claim-fields';
import type { ClaimDto } from '@/modules/claim/serializers/claim.serializer';
import { updateStatusClaimAction } from '@/app/[companyId]/claims/actions';
import { CLAIM_STATUS_LABELS } from '../labels';

type Props = { companyId: string; claim: ClaimDto };

/** Actualizar Estado desde el detalle: estado + notas de resolución en un solo envío. */
export function ClaimStatusForm({ companyId, claim }: Props) {
  const [status, setStatus] = useState<ClaimStatus>(claim.status);
  const [resolutionNotes, setResolutionNotes] = useState(claim.resolutionNotes ?? '');

  const [state, formAction, pending] = useActionState(
    updateStatusClaimAction.bind(null, companyId, claim.id, 'show'),
    initialActionState,
  );

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Estado</Label>
        <SearchableSelect
          id="status"
          name="status"
          options={CLAIM_STATUSES.map((value) => ({ value, label: CLAIM_STATUS_LABELS[value] }))}
          value={status}
          onChange={(value) => setStatus((value ?? claim.status) as ClaimStatus)}
          placeholder="Selecciona un estado"
          emptyText="Sin estados"
          aria-invalid={Boolean(errors.status)}
          className={cn('h-[42px] rounded-[10px]', errors.status && 'border-bad')}
        />
        {errors.status?.length ? <p className="text-bad text-sm">{errors.status[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resolutionNotes">Notas de resolución</Label>
        <Textarea
          id="resolutionNotes"
          name="resolutionNotes"
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          rows={4}
          maxLength={CLAIM_RESOLUTION_NOTES_MAX}
          placeholder="Qué se hizo para atender el reclamo"
          className={cn('rounded-[10px]', errors.resolutionNotes && 'border-bad')}
        />
        {errors.resolutionNotes?.length ? <p className="text-bad text-sm">{errors.resolutionNotes[0]}</p> : null}
        <p className="text-muted-foreground text-[12.5px]">
          Al cerrar el reclamo ya no podrás editarlo ni volver a cambiar su estado.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="rounded-[10px] font-semibold" disabled={pending}>
          {pending ? 'Guardando...' : 'Actualizar estado'}
        </Button>
      </div>
    </form>
  );
}
