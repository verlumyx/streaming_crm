'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, Eye, MoreHorizontal, Plus, Power, Search, Users } from 'lucide-react';
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
import { SERVICE_PERMISSIONS } from '@/modules/service/permissions';
import { serviceRoutes } from '@/modules/service/routes';
import { updateServiceStatusAction } from '@/app/[companyId]/services/actions';
import type { ServiceDto } from '@/modules/service/serializers/service.serializer';
import type { ServiceFilters, ServiceMeta } from '../types/Service';
import { ServiceLogo } from './ServiceLogo';

const COLUMNS = 'lg:grid-cols-[0.9fr_2.4fr_1.2fr_1fr_1fr]';

const TEXT_FILTERS: Array<[keyof Omit<ServiceFilters, 'active'>, string]> = [
  ['name', 'Nombre'],
  ['code', 'Código'],
];

type Props = { companyId: string; services: ServiceDto[]; meta: ServiceMeta; filters: ServiceFilters };

export function ServiceList({ companyId, services, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ServiceFilters>(initialFilters);

  const applyFilters = (next: ServiceFilters) => {
    setFilters(next);
    router.push(serviceRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(serviceRoutes.index(companyId));
  };

  const toggleStatus = (service: ServiceDto) => {
    startTransition(async () => {
      const result = await updateServiceStatusAction(companyId, service.id, !service.active);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  return (
    <PageShell
      title="Servicios"
      subtitle={`${meta.total} servicio${meta.total !== 1 ? 's' : ''} en el catálogo`}
      actions={
        can(SERVICE_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(serviceRoutes.create(companyId))}
          >
            <Plus />
            Nuevo servicio
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <Label htmlFor="filter-active">Estado</Label>
            <Select
              value={filters.active ?? 'all'}
              onValueChange={(value) =>
                applyFilters({ ...filters, active: value === 'all' ? undefined : (value as ServiceFilters['active']) })
              }
            >
              <SelectTrigger id="filter-active" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Activos</SelectItem>
                <SelectItem value="0">Inactivos</SelectItem>
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
          <ListGridHeadCell>Servicio</ListGridHeadCell>
          <ListGridHeadCell>Máx. perfiles</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {services.map((service) => (
            <ListGridRow
              key={service.id}
              columns={COLUMNS}
              onClick={() => router.push(serviceRoutes.show(companyId, service.id))}
            >
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{service.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <ServiceLogo name={service.name} logoUrl={service.logoUrl} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{service.name}</span>
                  <span className="text-muted-foreground truncate text-[12.5px] lg:hidden">{service.code}</span>
                </div>
              </div>
              <div className="hidden lg:flex lg:items-center lg:gap-1.5">
                <Users className="text-muted-foreground size-4" />
                <span className="font-bold tabular-nums">{service.maxProfiles}</span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={service.active ? 'activo' : 'inactivo'} />
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(serviceRoutes.show(companyId, service.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {can(SERVICE_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(serviceRoutes.edit(companyId, service.id))}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {can(SERVICE_PERMISSIONS.UPDATE_STATUS) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(service)}>
                          <Power className="mr-2 size-4" />
                          {service.active ? 'Inactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {services.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={services.length} total={meta.total} noun="servicio" />
      </ListGrid>
    </PageShell>
  );
}
