import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { todayIsoDate } from '@/lib/format';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import { accountRoutes } from '@/modules/account/routes';
import { createServiceContainer } from '@/modules/service/container';
import { toServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { AccountCreate } from '@/modules/account/ui/components/AccountCreate';

export const metadata: Metadata = { title: 'Nueva cuenta' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). Draft id and "today" are resolved here so server and client render the same values. */
export default async function AccountCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, ACCOUNT_PERMISSIONS.CREATE);

  const services = await createServiceContainer(db).listActiveService.execute(companyId);

  return (
    <PageShell
      back={<BackLink href={accountRoutes.index(companyId)}>Cuentas</BackLink>}
      title="Nueva cuenta"
      subtitle="Registra una cuenta de streaming y sus perfiles"
    >
      <AccountCreate
        companyId={companyId}
        initialId={uuidv7()}
        today={todayIsoDate()}
        services={services.map(toServiceOptionDto)}
      />
    </PageShell>
  );
}
