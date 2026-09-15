import type { Metadata } from 'next';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { saleRoutes } from '@/modules/sale/routes';
import { createSaleContainer } from '@/modules/sale/container';
import {
  toSaleAvailableProfileDto,
  toSaleClientOptionDto,
  toSalePlanOptionDto,
} from '@/modules/sale/serializers/sale.serializer';
import { SaleCreate } from '@/modules/sale/ui/components/SaleCreate';

export const metadata: Metadata = { title: 'Nueva venta' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Crear (wizard). `?client=` preselects an active client of the company. */
export default async function SaleCreatePage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, SALE_PERMISSIONS.CREATE);

  const { client } = await searchParams;
  const requestedClientId = Array.isArray(client) ? client[0] : client;
  const form = await createSaleContainer(db).createFormService.execute(companyId, requestedClientId);

  return (
    <PageShell
      back={<BackLink href={saleRoutes.index(companyId)}>Ventas</BackLink>}
      title="Nueva venta"
      subtitle="Cliente, plan y perfiles en tres pasos."
      className="max-w-4xl"
    >
      <SaleCreate
        companyId={companyId}
        initialId={uuidv7()}
        today={todayIsoDate()}
        clients={form.clients.map(toSaleClientOptionDto)}
        plans={form.plans.map(toSalePlanOptionDto)}
        availableProfiles={form.availableProfiles.map(toSaleAvailableProfileDto)}
        preselectedClientId={form.preselectedClientId}
      />
    </PageShell>
  );
}
