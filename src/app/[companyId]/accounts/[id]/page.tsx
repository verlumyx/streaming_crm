import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import { createAccountContainer } from '@/modules/account/container';
import { AccountNotFoundException } from '@/modules/account/exceptions/account-not-found.exception';
import {
  summarizeProfiles,
  toAccountDto,
  toAccountRenewalDto,
  toProfileDto,
} from '@/modules/account/serializers/account.serializer';
import { AccountShow } from '@/modules/account/ui/components/AccountShow';

export const metadata: Metadata = { title: 'Cuenta' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function AccountShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, ACCOUNT_PERMISSIONS.SHOW);
  if (!isUuid(id)) notFound();

  let detail;
  try {
    detail = await createAccountContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof AccountNotFoundException) notFound();
    throw error;
  }

  const [canUpdate, canRenew] = await Promise.all([
    hasPermission(companyId, ACCOUNT_PERMISSIONS.UPDATE),
    hasPermission(companyId, ACCOUNT_PERMISSIONS.RENEW),
  ]);

  return (
    <AccountShow
      companyId={companyId}
      account={toAccountDto(detail.account, detail.service, summarizeProfiles(detail.profiles))}
      profiles={detail.profiles.map(toProfileDto)}
      renewals={detail.renewals.map(toAccountRenewalDto)}
      canUpdate={canUpdate}
      canRenew={canRenew}
    />
  );
}
