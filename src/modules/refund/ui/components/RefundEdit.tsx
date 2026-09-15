'use client';

import { Card } from '@/components/ui/card';
import type { RefundDto } from '@/modules/refund/serializers/refund.serializer';
import { RefundFormProvider } from '../contexts/RefundFormContext';
import { useRefundForm } from '../hooks/useRefundForm';
import { RefundForm } from './RefundForm';

type Props = { companyId: string; refund: RefundDto; onCancel: () => void };

/** Editar (inline on the detail page): same form bound to `updateRefundAction`. */
export function RefundEdit({ companyId, refund, onCancel }: Props) {
  const form = useRefundForm({ mode: 'edit', companyId, refund });

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-base font-bold tracking-tight">Editar reembolso</h2>
      <RefundFormProvider value={form}>
        <RefundForm onCancel={onCancel} />
      </RefundFormProvider>
    </Card>
  );
}
