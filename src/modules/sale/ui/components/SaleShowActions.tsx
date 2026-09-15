'use client';

import { useState } from 'react';
import { Ban, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SaleAvailableProfileDto, SaleDetailDto } from '@/modules/sale/serializers/sale.serializer';
import { SaleCancelDialog } from './SaleCancelDialog';
import { SaleReactivateDialog } from './SaleReactivateDialog';
import { SaleRenewDialog } from './SaleRenewDialog';

type Props = {
  companyId: string;
  sale: SaleDetailDto;
  replacementProfiles: SaleAvailableProfileDto[];
  canRenew: boolean;
  canReactivate: boolean;
  canCancel: boolean;
};

type OpenDialog = 'renew' | 'reactivate' | 'cancel' | null;

/** Contextual buttons of the detail page (permission + sale flags) and their dialogs. */
export function SaleShowActions({ companyId, sale, replacementProfiles, canRenew, canReactivate, canCancel }: Props) {
  const [open, setOpen] = useState<OpenDialog>(null);
  const close = () => setOpen(null);

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
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
        {sale.status !== 'cancelled' && canCancel && (
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
    </>
  );
}
