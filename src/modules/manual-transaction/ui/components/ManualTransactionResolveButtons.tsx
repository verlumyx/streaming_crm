'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  approveManualTransactionAction,
  cancelManualTransactionAction,
} from '@/app/[companyId]/manual-transactions/actions';
import type { ActionState } from '@/modules/shared/actions/action-state';

type Props = { companyId: string; id: string; canApprove: boolean; canCancel: boolean };

/** Aprobar / Cancelar on the detail page. Both land back on the detail page with a flash. */
export function ManualTransactionResolveButtons({ companyId, id, canApprove, canCancel }: Props) {
  const [pending, startTransition] = useTransition();

  const run = (action: (companyId: string, id: string) => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action(companyId, id);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo completar la acción.');
    });

  if (!canApprove && !canCancel) return null;

  return (
    <div className="flex gap-2.5">
      {canApprove && (
        <Button className="rounded-[10px] font-semibold" disabled={pending} onClick={() => run(approveManualTransactionAction)}>
          <Check className="mr-1.5 size-4" />
          Aprobar
        </Button>
      )}
      {canCancel && (
        <Button
          variant="outline"
          className="bg-card rounded-[10px] font-semibold"
          disabled={pending}
          onClick={() => run(cancelManualTransactionAction)}
        >
          <X className="mr-1.5 size-4" />
          Cancelar
        </Button>
      )}
    </div>
  );
}
