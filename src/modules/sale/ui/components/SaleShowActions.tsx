'use client';

import { useState } from 'react';
import { Ban, Check, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SaleAvailableProfileDto, SaleDetailDto } from '@/modules/sale/serializers/sale.serializer';
import { useSaleApprove } from '../hooks/useSaleApprove';
import { SaleCancelDialog } from './SaleCancelDialog';
import { SaleReactivateDialog } from './SaleReactivateDialog';
import { SaleRejectDialog } from './SaleRejectDialog';
import { SaleRenewDialog } from './SaleRenewDialog';

type Props = {
  companyId: string;
  sale: SaleDetailDto;
  replacementProfiles: SaleAvailableProfileDto[];
  canRenew: boolean;
  canReactivate: boolean;
  canCancel: boolean;
  canApprove: boolean;
};

type OpenDialog = 'renew' | 'reactivate' | 'cancel' | 'reject' | null;

/** Contextual buttons of the detail page (permission + sale flags) and their dialogs. */
export function SaleShowActions({
  companyId,
  sale,
  replacementProfiles,
  canRenew,
  canReactivate,
  canCancel,
  canApprove,
}: Props) {
  const [open, setOpen] = useState<OpenDialog>(null);
  const close = () => setOpen(null);
  const { approve, approving } = useSaleApprove(companyId);

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {sale.canBeApproved && canApprove && (
          <>
            <Button className="h-10 rounded-[11px] px-4 font-semibold" disabled={approving} onClick={() => approve(sale.id)}>
              <Check />
              {approving ? 'Aprobando…' : 'Aprobar'}
            </Button>
            <Button
              variant="destructive"
              className="h-10 rounded-[11px] px-4 font-semibold"
              disabled={approving}
              onClick={() => setOpen('reject')}
            >
              <X />
              Rechazar
            </Button>
          </>
        )}
        {sale.canBeRenewed && canRenew && (
          <Button className="h-10 rounded-[11px] px-4 font-semibold" onClick={() => setOpen('renew')}>
            <RefreshCw />
            Renovar
          </Button>
        )}
        {sale.canBeReactivated && canReactivate && (
          <Button className="h-10 rounded-[11px] px-4 font-semibold" onClick={() => setOpen('reactivate')}>
            <RotateCcw />
            Reactivar
          </Button>
        )}
        {sale.canBeCancelled && canCancel && (
          <Button
            variant="outline"
            className="bg-card h-10 rounded-[11px] px-4 font-semibold"
            onClick={() => setOpen('cancel')}
          >
            <Ban />
            Expulsar
          </Button>
        )}
      </div>

      <SaleRenewDialog companyId={companyId} sale={open === 'renew' ? sale : null} onClose={close} />
      <SaleReactivateDialog
        companyId={companyId}
        sale={open === 'reactivate' ? sale : null}
        availableProfiles={replacementProfiles}
        requiredCount={sale.requiredProfileCount}
        onClose={close}
      />
      <SaleCancelDialog companyId={companyId} sale={open === 'cancel' ? sale : null} onClose={close} />
      <SaleRejectDialog companyId={companyId} sale={open === 'reject' ? sale : null} onClose={close} />
    </>
  );
}
