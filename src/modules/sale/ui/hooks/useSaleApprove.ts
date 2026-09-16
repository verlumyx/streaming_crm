'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { approveSaleAction } from '@/app/[companyId]/sales/actions';
import { unavailableProfilesOf } from '../types/Sale';

/** Aprobar a pending sale from a button or a menu item; failures (e.g. profiles taken meanwhile) become a toast. */
export function useSaleApprove(companyId: string) {
  const [approving, startTransition] = useTransition();

  const approve = (saleId: string, returnTo?: string) =>
    startTransition(async () => {
      const result = await approveSaleAction(companyId, saleId, returnTo);
      if (!result || result.status === 'idle') return;

      const labels = unavailableProfilesOf(result.details).map((p) => p.label);
      toast.error(result.message ?? 'No se pudo aprobar la venta.', {
        description: labels.length > 0 ? labels.join(', ') : undefined,
      });
    });

  return { approve, approving };
}
