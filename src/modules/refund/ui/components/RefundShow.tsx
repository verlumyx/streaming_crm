'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, DollarSign, Hash, Pencil, ShoppingCart, Undo2, User, X } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { money, formatDate, formatDateTime } from '@/lib/format';
import type { ActionState } from '@/modules/shared/actions/action-state';
import { TRANSACTION_CATEGORY_LABELS } from '@/modules/transaction/models/transaction.model';
import { saleRoutes } from '@/modules/sale/routes';
import { refundRoutes } from '@/modules/refund/routes';
import type { RefundDto } from '@/modules/refund/serializers/refund.serializer';
import { approveRefundAction, rejectRefundAction } from '@/app/[companyId]/refunds/actions';
import { REFUND_STATUS_LABELS, refundStatusPill } from '../labels';
import { RefundEdit } from './RefundEdit';

type Props = {
  companyId: string;
  refund: RefundDto;
  canUpdate: boolean;
  canApprove: boolean;
  canReject: boolean;
  initialEditing: boolean;
};

/** Ver: hero with the contextual actions, inline edit form, metrics, reason and ledger entries. */
export function RefundShow({ companyId, refund, canUpdate, canApprove, canReject, initialEditing }: Props) {
  const [editing, setEditing] = useState(initialEditing);
  const [pending, startTransition] = useTransition();

  const resolve = (action: (companyId: string, id: string) => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action(companyId, refund.id);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo completar la acción.');
    });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6 pb-14">
      <BackLink href={refundRoutes.index(companyId)}>Reembolsos</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <span className="bg-muted text-muted-foreground grid size-16 shrink-0 place-items-center rounded-[16px] border">
            <Undo2 className="size-7" />
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{refund.client?.name ?? '—'}</h1>
              <StatusPill kind={refundStatusPill(refund.status)}>{REFUND_STATUS_LABELS[refund.status]}</StatusPill>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <HeroMeta icon={Hash}>{refund.code}</HeroMeta>
              <HeroMeta icon={ShoppingCart}>
                {refund.sale ? (
                  <Link href={saleRoutes.show(companyId, refund.sale.id)} className="hover:text-primary underline-offset-2 hover:underline">
                    Venta {refund.sale.code}
                  </Link>
                ) : (
                  'Venta —'
                )}
              </HeroMeta>
              {refund.requestedByUser && <HeroMeta icon={User}>{refund.requestedByUser.name}</HeroMeta>}
            </div>
          </div>
        </div>

        {refund.isPending && (canUpdate || canApprove || canReject) && (
          <div className="flex flex-wrap gap-2.5">
            {canUpdate && !editing && (
              <Button
                variant="outline"
                className="bg-card h-10 rounded-[11px] px-4 font-semibold"
                disabled={pending}
                onClick={() => setEditing(true)}
              >
                <Pencil />
                Editar
              </Button>
            )}
            {canApprove && (
              <Button className="h-10 rounded-[11px] px-4 font-semibold" disabled={pending} onClick={() => resolve(approveRefundAction)}>
                <Check />
                Aprobar
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                className="h-10 rounded-[11px] px-4 font-semibold"
                disabled={pending}
                onClick={() => resolve(rejectRefundAction)}
              >
                <X />
                Rechazar
              </Button>
            )}
          </div>
        )}
      </Card>

      {editing && refund.isPending ? (
        <RefundEdit companyId={companyId} refund={refund} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <MiniStat label="Monto" value={money(refund.amount)} icon={DollarSign} />
            <MiniStat label="Venta" value={refund.sale?.code ?? '—'} icon={ShoppingCart} />
            <MiniStat
              label="Resuelto"
              value={refund.resolvedAt ? formatDateTime(refund.resolvedAt) : '—'}
              sub={refund.resolvedByUser?.name}
              icon={Check}
            />
          </div>

          {refund.reason && (
            <Card className="gap-2 rounded-2xl p-5">
              <div className="text-base font-bold tracking-tight">Razón</div>
              <p className="text-muted-foreground text-[13.5px] whitespace-pre-line">{refund.reason}</p>
            </Card>
          )}

          <Card className="gap-0 overflow-hidden rounded-2xl py-0">
            <div className="flex items-center gap-2 border-b p-5 text-base font-bold tracking-tight">
              <DollarSign className="text-muted-foreground size-4" />
              Transacciones
            </div>
            <div className="flex flex-col">
              {refund.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{transaction.description}</span>
                    <span className="text-muted-foreground text-[12.5px]">
                      {formatDate(transaction.date)} · {TRANSACTION_CATEGORY_LABELS[transaction.category]}
                    </span>
                  </div>
                  <span className="text-bad font-bold tabular-nums">-{money(transaction.amount)}</span>
                </div>
              ))}
              {refund.transactions.length === 0 && (
                <div className="text-muted-foreground p-8 text-center text-sm">
                  Sin transacciones asociadas. El egreso se registra al aprobar el reembolso.
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function HeroMeta({ icon: Icon, children }: { icon: typeof Hash; children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
      <Icon className="size-3.5 opacity-80" />
      {children}
    </span>
  );
}
