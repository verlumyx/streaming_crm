'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, Hash, MessageSquareWarning, Pencil, Radio, User } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { clientRoutes } from '@/modules/client/routes';
import { claimRoutes } from '@/modules/claim/routes';
import type { ClaimDto } from '@/modules/claim/serializers/claim.serializer';
import { CLAIM_CHANNEL_LABELS, CLAIM_STATUS_LABELS, claimStatusPill } from '../labels';
import { ClaimStatusForm } from './ClaimStatusForm';

type Props = { companyId: string; claim: ClaimDto; canUpdate: boolean; canUpdateStatus: boolean };

/** Ver: cabecera con el cliente y el estado, métricas, descripción y gestión del estado. */
export function ClaimShow({ companyId, claim, canUpdate, canUpdateStatus }: Props) {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6 pb-14">
      <BackLink href={claimRoutes.index(companyId)}>Reclamos</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <span className="bg-muted text-muted-foreground grid size-16 shrink-0 place-items-center rounded-[16px] border">
            <MessageSquareWarning className="size-7" />
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{claim.subject}</h1>
              <StatusPill kind={claimStatusPill(claim.status)}>{CLAIM_STATUS_LABELS[claim.status]}</StatusPill>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <HeroMeta icon={Hash}>{claim.code}</HeroMeta>
              <HeroMeta icon={User}>
                {claim.client ? (
                  <Link
                    href={clientRoutes.show(companyId, claim.client.id)}
                    className="hover:text-primary underline-offset-2 hover:underline"
                  >
                    {claim.client.name}
                  </Link>
                ) : (
                  '—'
                )}
              </HeroMeta>
              <HeroMeta icon={Radio}>{CLAIM_CHANNEL_LABELS[claim.channel]}</HeroMeta>
            </div>
          </div>
        </div>

        {canUpdate && !claim.isClosed && (
          <Button
            variant="outline"
            className="bg-card h-10 rounded-[11px] px-4 font-semibold"
            onClick={() => router.push(claimRoutes.edit(companyId, claim.id))}
          >
            <Pencil />
            Editar
          </Button>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <MiniStat label="Canal" value={CLAIM_CHANNEL_LABELS[claim.channel]} icon={Radio} />
        <MiniStat
          label="Levantado"
          value={formatDateTime(claim.createdAt)}
          sub={claim.reportedByUser?.name}
          icon={CalendarClock}
        />
        <MiniStat
          label="Resuelto"
          value={claim.resolvedAt ? formatDateTime(claim.resolvedAt) : '—'}
          sub={claim.resolvedByUser?.name}
          icon={User}
        />
      </div>

      <Card className="gap-2 rounded-2xl p-5">
        <div className="text-base font-bold tracking-tight">Descripción</div>
        <p className="text-muted-foreground text-[13.5px] whitespace-pre-line">{claim.description}</p>
      </Card>

      {canUpdateStatus && !claim.isClosed ? (
        <Card className="gap-4 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Gestión del reclamo</div>
          <ClaimStatusForm companyId={companyId} claim={claim} />
        </Card>
      ) : (
        claim.resolutionNotes && (
          <Card className="gap-2 rounded-2xl p-5">
            <div className="text-base font-bold tracking-tight">Notas de resolución</div>
            <p className="text-muted-foreground text-[13.5px] whitespace-pre-line">{claim.resolutionNotes}</p>
          </Card>
        )
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
