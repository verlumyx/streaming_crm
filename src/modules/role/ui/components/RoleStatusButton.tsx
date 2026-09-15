'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateRoleStatusAction } from '@/app/[companyId]/roles/actions';
import type { RoleStatus } from '@/modules/role/models/role.model';

type Props = { companyId: string; roleId: string; status: RoleStatus };

/** Activar / Inactivar from the detail page (lands back on the detail page). */
export function RoleStatusButton({ companyId, roleId, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="bg-card h-10 rounded-[11px] px-4 font-semibold"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateRoleStatusAction(
            companyId,
            roleId,
            status === 'active' ? 'inactive' : 'active',
            'show',
          );
          if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
        })
      }
    >
      <Power />
      {status === 'active' ? 'Inactivar' : 'Activar'}
    </Button>
  );
}
