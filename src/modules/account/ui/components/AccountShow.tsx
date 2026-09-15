import Link from 'next/link';
import { CalendarClock, DollarSign, Edit, Hash, KeyRound, Layers, Mail, StickyNote, Tv, Users } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { MiniStat } from '@/components/mini-stat';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clp, formatDate } from '@/lib/format';
import { accountRoutes } from '@/modules/account/routes';
import type { AccountDto, AccountRenewalDto, ProfileDto } from '@/modules/account/serializers/account.serializer';
import {
  ACCOUNT_STATUS_LABELS,
  PROFILE_STATUS_LABELS,
  accountStatusPill,
  profileStatusPill,
} from '../account-labels';
import { AccountCredentials } from './AccountCredentials';
import { AccountRenewals } from './AccountRenewals';

type Props = {
  companyId: string;
  account: AccountDto;
  profiles: ProfileDto[];
  renewals: AccountRenewalDto[];
  canUpdate: boolean;
  canRenew: boolean;
};

/** Ver: hero, metrics, credentials, profiles and renewals. Server component. */
export function AccountShow({ companyId, account, profiles, renewals, canUpdate, canRenew }: Props) {
  const summary = account.profilesSummary;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={accountRoutes.index(companyId)}>Cuentas</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex min-w-0 items-center gap-[18px]">
          <span className="bg-muted text-muted-foreground grid size-16 shrink-0 place-items-center rounded-[16px] border">
            <KeyRound className="size-7" />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">{account.email}</h1>
              <StatusPill kind={accountStatusPill(account.status)}>{ACCOUNT_STATUS_LABELS[account.status]}</StatusPill>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Meta icon={Hash}>{account.code}</Meta>
              <Meta icon={Tv}>{account.service.name}</Meta>
              <Meta icon={Mail}>{account.email}</Meta>
            </div>
          </div>
        </div>
        {canUpdate && (
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline" className="bg-card h-10 rounded-[11px] px-4 font-semibold">
              <Link href={accountRoutes.edit(companyId, account.id)}>
                <Edit />
                Editar
              </Link>
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Costo" value={clp(account.cost)} icon={DollarSign} />
        <MiniStat label="Fecha de compra" value={formatDate(account.purchaseDate)} icon={CalendarClock} />
        <MiniStat label="Próxima renovación" value={formatDate(account.nextRenewal)} icon={CalendarClock} />
        <MiniStat label="Perfiles libres" value={`${summary.available}/${summary.total}`} icon={Users} />
      </div>

      <AccountCredentials companyId={companyId} accountId={account.id} />

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div className="inline-flex items-center gap-2 text-base font-bold tracking-tight">
            <Layers className="text-muted-foreground size-4" />
            Perfiles
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-2 text-[12.5px] font-semibold">
            <span>Total {summary.total}</span>
            <span>· Disponibles {summary.available}</span>
            <span>· Ocupados {summary.occupied}</span>
            <span>· Mantenimiento {summary.maintenance}</span>
          </div>
        </div>
        <div className="bg-muted text-muted-foreground hidden h-11 items-center gap-3 border-b px-5 text-[11.5px] font-bold tracking-wider uppercase lg:grid lg:grid-cols-[60px_1fr_1fr_2fr]">
          <div>#</div>
          <div>PIN</div>
          <div>Estado</div>
          <div>Notas</div>
        </div>
        <div className="flex flex-col">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="grid grid-cols-1 items-center gap-3 border-b px-5 py-3 last:border-b-0 lg:grid-cols-[60px_1fr_1fr_2fr]"
            >
              <div className="text-muted-foreground font-bold tabular-nums">#{profile.number}</div>
              <div className="font-mono tabular-nums">{profile.pin || '—'}</div>
              <div>
                <StatusPill kind={profileStatusPill(profile.status)}>{PROFILE_STATUS_LABELS[profile.status]}</StatusPill>
              </div>
              <div className="text-muted-foreground text-[13.5px]">{profile.notes ?? '—'}</div>
            </div>
          ))}
          {profiles.length === 0 && (
            <div className="text-muted-foreground p-8 text-center text-sm">Esta cuenta no tiene perfiles.</div>
          )}
        </div>
      </Card>

      <AccountRenewals companyId={companyId} account={account} renewals={renewals} canRenew={canRenew} />

      {account.notes && (
        <Card className="gap-2 rounded-2xl px-[18px] py-4">
          <div className="text-muted-foreground flex items-center gap-2 text-[13px] font-bold">
            <StickyNote className="size-[15px]" />
            Notas
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{account.notes}</p>
        </Card>
      )}
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Hash; children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
      <Icon className="size-3.5 opacity-80" />
      {children}
    </span>
  );
}
