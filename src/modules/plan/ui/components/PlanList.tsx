'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, Eye, MoreHorizontal, Package, Plus, Power, Search } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import { PLAN_CAPACITIES } from '@/modules/plan/models/plan.model';
import { PLAN_PERMISSIONS } from '@/modules/plan/permissions';
import { planRoutes } from '@/modules/plan/routes';
import { updatePlanStatusAction } from '@/app/[companyId]/plans/actions';
import type { PlanDto } from '@/modules/plan/serializers/plan.serializer';
import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import type { PlanFilters, PlanMeta } from '../types/Plan';
import { PLAN_CAPACITY_LABELS, planDurationLabel } from '../plan-labels';

const COLUMNS = 'lg:grid-cols-[0.9fr_2.2fr_1.1fr_0.9fr_1fr_0.9fr_0.9fr]';

const TEXT_FILTERS: Array<[keyof Pick<PlanFilters, 'name' | 'code'>, string]> = [
  ['name', 'Nombre'],
  ['code', 'Código'],
];

type Props = {
  companyId: string;
  plans: PlanDto[];
  services: ServiceOptionDto[];
  meta: PlanMeta;
  filters: PlanFilters;
};

export function PlanList({ companyId, plans, services, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<PlanFilters>(initialFilters);

  const applyFilters = (next: PlanFilters) => {
    setFilters(next);
    router.push(planRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(planRoutes.index(companyId));
  };

  const toggleStatus = (plan: PlanDto) => {
    startTransition(async () => {
      const result = await updatePlanStatusAction(companyId, plan.id, !plan.active);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  return (
    <PageShell
      title="Planes"
      subtitle={`${meta.total} plan${meta.total !== 1 ? 'es' : ''} vendible${meta.total !== 1 ? 's' : ''} en el catálogo`}
      actions={
        can(PLAN_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(planRoutes.create(companyId))}
          >
            <Plus />
            Nuevo plan
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <Label htmlFor="filter-service">Servicio</Label>
            <Select
              value={filters.serviceId ?? 'all'}
              onValueChange={(value) => applyFilters({ ...filters, serviceId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger id="filter-service" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-capacity">Capacidad</Label>
            <Select
              value={filters.capacity ?? 'all'}
              onValueChange={(value) =>
                applyFilters({ ...filters, capacity: value === 'all' ? undefined : (value as PlanFilters['capacity']) })
              }
            >
              <SelectTrigger id="filter-capacity" className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PLAN_CAPACITIES.map((capacity) => (
                  <SelectItem key={capacity} value={capacity}>
                    {PLAN_CAPACITY_LABELS[capacity]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-active">Estado</Label>
            <Select
              value={filters.active ?? 'all'}
              onValueChange={(value) =>
                applyFilters({ ...filters, active: value === 'all' ? undefined : (value as PlanFilters['active']) })
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
          <ListGridHeadCell>Plan</ListGridHeadCell>
          <ListGridHeadCell>Capacidad</ListGridHeadCell>
          <ListGridHeadCell>Duración</ListGridHeadCell>
          <ListGridHeadCell>Precio</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {plans.map((plan) => (
            <ListGridRow key={plan.id} columns={COLUMNS} onClick={() => router.push(planRoutes.show(companyId, plan.id))}>
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{plan.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[11px] border">
                  <Package className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{plan.name}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{plan.service.name}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <span className="text-[13.5px] font-semibold">{PLAN_CAPACITY_LABELS[plan.capacity]}</span>
              </div>
              <div className="hidden lg:block">
                <span className="font-semibold tabular-nums">{planDurationLabel(plan.durationDays)}</span>
              </div>
              <div className="hidden lg:block">
                <span className="font-bold tabular-nums">{money(plan.salePrice)}</span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={plan.active ? 'activo' : 'inactivo'} />
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(planRoutes.show(companyId, plan.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {can(PLAN_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(planRoutes.edit(companyId, plan.id))}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {can(PLAN_PERMISSIONS.UPDATE_STATUS) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(plan)}>
                          <Power className="mr-2 size-4" />
                          {plan.active ? 'Inactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {plans.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={plans.length} total={meta.total} noun="plan" nounPlural="planes">
          <ListPagination meta={meta} href={(query) => planRoutes.index(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
