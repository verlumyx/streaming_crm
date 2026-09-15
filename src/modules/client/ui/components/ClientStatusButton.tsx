'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateClientStatusAction } from '@/app/[companyId]/clients/actions';
import type { ClientStatus } from '@/modules/client/models/client.model';

type Props = { companyId: string; clientId: string; status: ClientStatus };

/** Activar / Desactivar from the detail page (lands back on the detail page). */
export function ClientStatusButton({ companyId, clientId, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="bg-card h-10 rounded-[11px] px-4 font-semibold"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateClientStatusAction(
            companyId,
            clientId,
            status === 'active' ? 'inactive' : 'active',
            'show',
          );
          if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
        })
      }
    >
      <Power />
      {status === 'active' ? 'Desactivar' : 'Activar'}
    </Button>
  );
}
