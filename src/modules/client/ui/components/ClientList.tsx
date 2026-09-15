'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, Eye, MoreHorizontal, Plus, Power, Search } from 'lucide-react';
import { InitialsAvatar } from '@/components/initials-avatar';
import { ServiceStack } from '@/components/service-badge';
import { StatusPill } from '@/components/status-pill';
import { WhatsAppButton } from '@/components/whatsapp-button';
import {
  ListFooter,
  ListGrid,
  ListGridBody,
  ListGridHeadCell,
  ListGridHeader,
  ListGridRow,
  PageShell,
} from '@/components/page-shell';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/modules/shared/auth/company-context';
import { CLIENT_PERMISSIONS } from '@/modules/client/permissions';
import { clientRoutes } from '@/modules/client/routes';
import { updateClientStatusAction } from '@/app/[companyId]/clients/actions';
import type { ClientDto, ClientPlatformDto } from '@/modules/client/serializers/client.serializer';
import type { ClientFilters, ClientMeta } from '../types/Client';

const COLUMNS = 'lg:grid-cols-[0.9fr_2.2fr_1.2fr_0.9fr_1.2fr]';

const TEXT_FILTERS: Array<[keyof Omit<ClientFilters, 'status'>, string]> = [
  ['name', 'Nombre'],
  ['email', 'Correo'],
  ['phone', 'Teléfono'],
  ['code', 'Código'],
];

type Props = { companyId: string; clients: ClientDto[]; meta: ClientMeta; filters: ClientFilters };

export function ClientList({ companyId, clients, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ClientFilters>(initialFilters);
  const [platform, setPlatform] = useState('todas');

  const platformOptions = useMemo<ClientPlatformDto[]>(
    () => [...new Map(clients.flatMap((c) => c.platforms).map((p) => [p.id, p])).values()],
    [clients],
  );

  const rows = clients.filter((c) => platform === 'todas' || c.platforms.some((p) => p.id === platform));

  const applyFilters = (next: ClientFilters) => {
    setFilters(next);
    router.push(clientRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    setPlatform('todas');
    router.push(clientRoutes.index(companyId));
  };

  const toggleStatus = (client: ClientDto) => {
    startTransition(async () => {
      const result = await updateClientStatusAction(
        companyId,
        client.id,
        client.status === 'active' ? 'inactive' : 'active',
      );
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  return (
    <PageShell
      title="Clientes"
      subtitle={`${meta.total} cliente${meta.total !== 1 ? 's' : ''} · perfiles y cuentas de streaming`}
      actions={
        can(CLIENT_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(clientRoutes.create(companyId))}
          >
            <Plus />
            Nuevo cliente
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEXT_FILTERS.map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`filter-${key}`}>{label}</Label>
              <Input
                id={`filter-${key}`}
                type="text"
                placeholder={`Buscar por ${label.toLowerCase()}...`}
                value={filters[key] ?? ''}
                onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <Select
              value={filters.status ?? 'todos'}
              onValueChange={(value) =>
                applyFilters({ ...filters, status: value === 'todos' ? undefined : (value as ClientFilters['status']) })
              }
            >
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-platform">Plataforma</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="filter-platform" className="w-full">
                <SelectValue placeholder="Todas las plataformas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las plataformas</SelectItem>
                {platformOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <ListGridHeadCell>Cliente</ListGridHeadCell>
          <ListGridHeadCell>Plataformas</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {rows.map((client) => (
            <ListGridRow
              key={client.id}
              columns={COLUMNS}
              onClick={() => router.push(clientRoutes.show(companyId, client.id))}
            >
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{client.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <InitialsAvatar name={client.name} size={40} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{client.name}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{client.email ?? '—'}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <ServiceStack services={client.platforms} />
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={client.status === 'inactive' ? 'inactivo' : 'activo'} />
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                {client.phone && <WhatsAppButton tel={client.phone} />}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(clientRoutes.show(companyId, client.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {can(CLIENT_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(clientRoutes.edit(companyId, client.id))}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {can(CLIENT_PERMISSIONS.UPDATE_STATUS) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(client)}>
                          <Power className="mr-2 size-4" />
                          {client.status === 'active' ? 'Inactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {rows.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={rows.length} total={meta.total} noun="cliente" />
      </ListGrid>
    </PageShell>
  );
}
