import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import { accountRoutes } from '@/modules/account/routes';
import { createAccountContainer } from '@/modules/account/container';
import { AccountNotFoundException } from '@/modules/account/exceptions/account-not-found.exception';
import { summarizeProfiles, toAccountDto, toProfileDto } from '@/modules/account/serializers/account.serializer';
import { AccountEdit } from '@/modules/account/ui/components/AccountEdit';

export const metadata: Metadata = { title: 'Editar cuenta' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Editar (form). The service is immutable, so its own service is the only option. */
export default async function AccountEditPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, ACCOUNT_PERMISSIONS.UPDATE);
  if (!isUuid(id)) notFound();

  let detail;
  try {
    detail = await createAccountContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof AccountNotFoundException) notFound();
    throw error;
  }

  const account = toAccountDto(detail.account, detail.service, summarizeProfiles(detail.profiles));

  return (
    <PageShell
      back={<BackLink href={accountRoutes.show(companyId, account.id)}>{account.code}</BackLink>}
      title="Editar cuenta"
      subtitle="Modifica la cabecera y los perfiles de la cuenta"
    >
      <AccountEdit
        companyId={companyId}
        account={account}
        profiles={detail.profiles.map(toProfileDto)}
        services={[account.service]}
      />
    </PageShell>
  );
}
