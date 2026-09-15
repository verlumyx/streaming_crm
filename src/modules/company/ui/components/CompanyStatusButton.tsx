'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateCompanyStatusAction } from '@/app/[companyId]/companies/actions';
import type { CompanyStatus } from '@/modules/company/models/company.model';

type Props = { companyId: string; targetCompanyId: string; status: CompanyStatus };

/** Activar / Desactivar from the detail page (lands back on the detail page). */
export function CompanyStatusButton({ companyId, targetCompanyId, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="bg-card h-10 rounded-[11px] px-4 font-semibold"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateCompanyStatusAction(
            companyId,
            targetCompanyId,
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
