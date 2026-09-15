'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { refundRoutes } from '@/modules/refund/routes';
import type { RefundableSaleDto } from '@/modules/refund/serializers/refund.serializer';
import { RefundFormProvider } from '../contexts/RefundFormContext';
import { useRefundForm } from '../hooks/useRefundForm';
import { RefundForm } from './RefundForm';

type Props = { companyId: string; initialId: string; sales: RefundableSaleDto[] };

/** Crear: instantiates the form hook and exposes it through the context. */
export function RefundCreate({ companyId, initialId, sales }: Props) {
  const router = useRouter();
  const form = useRefundForm({ mode: 'create', companyId, initialId, sales });

  return (
    <Card className="rounded-2xl p-6">
      <RefundFormProvider value={form}>
        <RefundForm onCancel={() => router.push(refundRoutes.index(companyId))} />
      </RefundFormProvider>
    </Card>
  );
}
