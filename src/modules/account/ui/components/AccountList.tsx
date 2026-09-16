'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Eye, KeyRound, MoreHorizontal, Plus, RefreshCw, Search } from 'lucide-react';
import { StatusPill } from '@/components/status-pill';
import {
  ListFooter,
  ListGrid,
  ListGridBody,
  ListGridHeadCell,
  ListGridHeader,
  ListGridRow,
  PageShell,
} from '@/components/page-shell';
import { ListPagination } from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { money, formatDate } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import { ACCOUNT_STATUSES } from '@/modules/account/models/account.model';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import { accountRoutes } from '@/modules/account/routes';
import type { AccountDto } from '@/modules/account/serializers/account.serializer';
import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { ACCOUNT_STATUS_LABELS, accountStatusPill } from '../account-labels';
import type { AccountFilters, AccountMeta } from '../types/Account';
import { AccountCredentialsDialog } from './AccountCredentialsDialog';
import { AccountRenewDialog } from './AccountRenewDialog';

const COLUMNS = 'lg:grid-cols-[0.9fr_2.2fr_1.1fr_1fr_1.1fr_0.9fr_0.7fr]';

type Props = {
  companyId: string;
  accounts: AccountDto[];
  services: ServiceOptionDto[];
  meta: AccountMeta;
  filters: AccountFilters;
};

export function AccountList({ companyId, accounts, services, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [filters, setFilters] = useState<AccountFilters>(initialFilters);
  const [credentialsAccount, setCredentialsAccount] = useState<AccountDto | null>(null);
  const [renewAccount, setRenewAccount] = useState<AccountDto | null>(null);

  const applyFilters = (next: AccountFilters) => {
    setFilters(next);
    router.push(accountRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(accountRoutes.index(companyId));
  };

  return (
    <PageShell
      title="Cuentas"
      subtitle={`${meta.total} cuenta${meta.total !== 1 ? 's' : ''} en el inventario`}
      actions={
        can(ACCOUNT_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(accountRoutes.create(companyId))}
          >
            <Plus />
            Nueva cuenta
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-email">Email</Label>
            <Input
              id="filter-email"
              type="text"
              placeholder="Buscar por email..."
              value={filters.email ?? ''}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-code">Código</Label>
            <Input
              id="filter-code"
              type="text"
              placeholder="Buscar por código..."
              value={filters.code ?? ''}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <SearchableSelect
              id="filter-status"
              options={[
                { value: 'todos', label: 'Todos' },
                ...ACCOUNT_STATUSES.map((status) => ({ value: status, label: ACCOUNT_STATUS_LABELS[status] })),
              ]}
              value={filters.status ?? 'todos'}
              onChange={(value) =>
                applyFilters({
                  ...filters,
                  status: !value || value === 'todos' ? undefined : (value as AccountFilters['status']),
                })
              }
              placeholder="Todos"
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-service">Servicio</Label>
            <SearchableSelect
              id="filter-service"
              options={[
                { value: 'todos', label: 'Todos' },
                ...services.map((service) => ({ value: service.id, label: service.name })),
              ]}
              value={filters.serviceId ?? 'todos'}
              onChange={(value) =>
                applyFilters({ ...filters, serviceId: !value || value === 'todos' ? undefined : value })
              }
              placeholder="Todos"
              searchPlaceholder="Buscar servicio..."
              emptyText="Sin resultados"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => applyFilters(filters)}>
            <Search className="mr-2 size-4" />
            Buscar
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            Limpiar
          </Button>
        </div>
      </div>

      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Código</ListGridHeadCell>
          <ListGridHeadCell>Cuenta</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Perfiles</ListGridHeadCell>
          <ListGridHeadCell>Renovación</ListGridHeadCell>
          <ListGridHeadCell>Costo</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {accounts.map((account) => (
            <ListGridRow
              key={account.id}
              columns={COLUMNS}
              onClick={() => router.push(accountRoutes.show(companyId, account.id))}
            >
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{account.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[11px] border">
                  <KeyRound className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{account.email}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{account.service.name}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={accountStatusPill(account.status)}>{ACCOUNT_STATUS_LABELS[account.status]}</StatusPill>
              </div>
              <div className="hidden lg:block">
                <span className="text-[13.5px] font-semibold tabular-nums">
                  {account.profilesSummary.available}/{account.profilesSummary.total} libres
                </span>
              </div>
              <div className="hidden lg:block">
                <span className="font-semibold tabular-nums">{formatDate(account.nextRenewal)}</span>
              </div>
              <div className="hidden lg:block">
                <span className="font-bold tabular-nums">{money(account.cost)}</span>
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(accountRoutes.show(companyId, account.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {can(ACCOUNT_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(accountRoutes.edit(companyId, account.id))}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {(can(ACCOUNT_PERMISSIONS.CREDENTIALS) || can(ACCOUNT_PERMISSIONS.RENEW)) && <DropdownMenuSeparator />}
                    {can(ACCOUNT_PERMISSIONS.CREDENTIALS) && (
                      <DropdownMenuItem onSelect={() => setCredentialsAccount(account)}>
                        <KeyRound className="mr-2 size-4" />
                        Ver credenciales
                      </DropdownMenuItem>
                    )}
                    {can(ACCOUNT_PERMISSIONS.RENEW) && (
                      <DropdownMenuItem onSelect={() => setRenewAccount(account)}>
                        <RefreshCw className="mr-2 size-4" />
                        Registrar renovación
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {accounts.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={accounts.length} total={meta.total} noun="cuenta">
          <ListPagination meta={meta} href={(query) => accountRoutes.index(companyId, query)} />
        </ListFooter>
      </ListGrid>

      <AccountCredentialsDialog
        companyId={companyId}
        account={credentialsAccount}
        onClose={() => setCredentialsAccount(null)}
      />
      <AccountRenewDialog companyId={companyId} account={renewAccount} onClose={() => setRenewAccount(null)} />
    </PageShell>
  );
}
