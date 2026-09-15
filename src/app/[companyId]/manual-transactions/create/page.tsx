import type { Metadata } from 'next';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { uuidv7 } from '@/modules/shared/uuid';
import { todayIsoDate } from '@/lib/format';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { transactionCatalog } from '@/modules/transaction/models/transaction.model';
import { MANUAL_TRANSACTION_PERMISSIONS } from '@/modules/manual-transaction/permissions';
import { manualTransactionRoutes } from '@/modules/manual-transaction/routes';
import { ManualTransactionCreate } from '@/modules/manual-transaction/ui/components/ManualTransactionCreate';

export const metadata: Metadata = { title: 'Nueva transacción manual' };

type Props = { params: Promise<{ companyId: string }> };

/** Crear (form). The id, today's date and the category catalog are resolved on the server. */
export default async function ManualTransactionCreatePage({ params }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, MANUAL_TRANSACTION_PERMISSIONS.CREATE);

  return (
    <PageShell
      className="max-w-3xl"
      back={<BackLink href={manualTransactionRoutes.index(companyId)}>Transacciones manuales</BackLink>}
      title="Nueva transacción manual"
      subtitle="Registra una cabecera con una o más líneas tipadas por categoría."
    >
      <ManualTransactionCreate
        companyId={companyId}
        initialId={uuidv7()}
        today={todayIsoDate()}
        catalog={transactionCatalog()}
      />
    </PageShell>
  );
}
