'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateUserStatusAction } from '@/app/[companyId]/users/actions';
import type { MembershipStatus } from '@/modules/shared/models/user-company.model';

type Props = { companyId: string; userId: string; status: MembershipStatus };

/** Activar / Inactivar the membership from the detail page (lands back on the detail page). */
export function UserStatusButton({ companyId, userId, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="bg-card h-10 rounded-[11px] px-4 font-semibold"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateUserStatusAction(
            companyId,
            userId,
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
