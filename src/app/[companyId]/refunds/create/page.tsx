import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { REFUND_PERMISSIONS } from '@/modules/refund/permissions';
import { createRefundContainer } from '@/modules/refund/container';
import { refundRoutes } from '@/modules/refund/routes';
import { toRefundableSaleDto } from '@/modules/refund/serializers/refund.serializer';
import { RefundCreate } from '@/modules/refund/ui/components/RefundCreate';

export const metadata: Metadata = { title: 'Nuevo reembolso' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form): the id and the refundable sales (latest 100 active/cancelled) are resolved on the server. */
export default async function RefundCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, REFUND_PERMISSIONS.CREATE);

  const sales = await createRefundContainer(db).createFormService.execute(companyId);

  return (
    <PageShell
      className="max-w-2xl"
      back={<BackLink href={refundRoutes.index(companyId)}>Reembolsos</BackLink>}
      title="Crear reembolso"
      subtitle="Registra un reembolso pendiente de aprobación."
    >
      <RefundCreate companyId={companyId} initialId={uuidv7()} sales={sales.map(toRefundableSaleDto)} />
    </PageShell>
  );
}
