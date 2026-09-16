'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { money, formatDate } from '@/lib/format';
import type { AccountDto, AccountRenewalDto } from '@/modules/account/serializers/account.serializer';
import { RENEWAL_TYPE_LABELS } from '../account-labels';
import { AccountRenewDialog } from './AccountRenewDialog';

type Props = { companyId: string; account: AccountDto; renewals: AccountRenewalDto[]; canRenew: boolean };

const PER_PAGE = 10;

/** Renewals history of the detail page with client-side pagination. */
export function AccountRenewals({ companyId, account, renewals, canRenew }: Props) {
  const [renewing, setRenewing] = useState(false);
  const [page, setPage] = useState(1);

  const total = renewals.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage * PER_PAGE, total);

  const visible = useMemo(
    () => renewals.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [renewals, currentPage],
  );

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div className="inline-flex items-center gap-2 text-base font-bold tracking-tight">
          <RefreshCw className="text-muted-foreground size-4" />
          Renovaciones
        </div>
        <Button
          size="sm"
          className="rounded-[10px] font-semibold"
          disabled={!canRenew}
          title={canRenew ? undefined : 'No tienes permiso para registrar renovaciones'}
          onClick={() => setRenewing(true)}
        >
          <Plus className="size-4" />
          Registrar renovación
        </Button>
      </div>
      <div className="bg-muted text-muted-foreground hidden h-11 items-center gap-3 border-b px-5 text-[11.5px] font-bold tracking-wider uppercase lg:grid lg:grid-cols-4">
        <div>Fecha de pago</div>
        <div>Tipo</div>
        <div>Monto</div>
        <div>Vencimiento</div>
      </div>
      <div className="flex flex-col">
        {visible.map((renewal) => (
          <div key={renewal.id} className="grid grid-cols-1 items-center gap-3 border-b px-5 py-3 last:border-b-0 lg:grid-cols-4">
            <div className="font-medium tabular-nums">{formatDate(renewal.paidAt)}</div>
            <div className="text-muted-foreground text-[13.5px] font-semibold">{RENEWAL_TYPE_LABELS[renewal.type]}</div>
            <div className="font-bold tabular-nums">{money(renewal.amount)}</div>
            <div className="tabular-nums">{formatDate(renewal.periodEnd)}</div>
          </div>
        ))}
        {total === 0 && (
          <div className="text-muted-foreground p-8 text-center text-sm">Esta cuenta no tiene renovaciones registradas.</div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5">
        <span className="text-muted-foreground text-[13px] font-semibold">
          Mostrando {from}–{to} de {total} renovación{total !== 1 ? 'es' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-card rounded-[10px] font-semibold"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card rounded-[10px] font-semibold"
            disabled={to >= total}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <AccountRenewDialog companyId={companyId} account={renewing ? account : null} onClose={() => setRenewing(false)} />
    </Card>
  );
}
