'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateServiceStatusAction } from '@/app/[companyId]/services/actions';

type Props = { companyId: string; serviceId: string; active: boolean };

/** Activar / Desactivar from the detail page (lands back on the detail page). */
export function ServiceStatusButton({ companyId, serviceId, active }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="bg-card h-10 rounded-[11px] px-4 font-semibold"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateServiceStatusAction(companyId, serviceId, !active, 'show');
          if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
        })
      }
    >
      <Power />
      {active ? 'Desactivar' : 'Activar'}
    </Button>
  );
}
