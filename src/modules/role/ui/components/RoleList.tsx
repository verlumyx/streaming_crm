'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, Eye, MoreHorizontal, Plus, Power, Search, ShieldCheck } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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
import { formatDateTime } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import { ROLE_PERMISSIONS } from '@/modules/role/permissions';
import { roleRoutes } from '@/modules/role/routes';
import { updateRoleStatusAction } from '@/app/[companyId]/roles/actions';
import type { RoleDto } from '@/modules/role/serializers/role.serializer';
import { PERMISSION_TYPE_LABELS, type RoleFilters, type RoleMeta } from '../types/Role';

const COLUMNS = 'lg:grid-cols-[1.4fr_0.9fr_2fr_0.8fr_1fr_0.6fr]';

const TEXT_FILTERS: Array<[keyof Omit<RoleFilters, 'status'>, string]> = [
  ['name', 'Nombre'],
  ['description', 'Descripción'],
];

type Props = { companyId: string; roles: RoleDto[]; meta: RoleMeta; filters: RoleFilters };

export function RoleList({ companyId, roles, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<RoleFilters>(initialFilters);

  const applyFilters = (next: RoleFilters) => {
    setFilters(next);
    router.push(roleRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(roleRoutes.index(companyId));
  };

  const toggleStatus = (role: RoleDto) => {
    startTransition(async () => {
      const result = await updateRoleStatusAction(companyId, role.id, role.status === 'active' ? 'inactive' : 'active');
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  return (
    <PageShell
      title="Roles"
      subtitle={`${meta.total} rol${meta.total !== 1 ? 'es' : ''} · permisos por empresa`}
      actions={
        can(ROLE_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(roleRoutes.create(companyId))}
          >
            <Plus />
            Nuevo rol
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
            <SearchableSelect
              id="filter-status"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
              ]}
              value={filters.status ?? 'todos'}
              onChange={(value) =>
                applyFilters({
                  ...filters,
                  status: !value || value === 'todos' ? undefined : (value as RoleFilters['status']),
                })
              }
              placeholder="Estado"
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
          <ListGridHeadCell>Nombre</ListGridHeadCell>
          <ListGridHeadCell>Permisos</ListGridHeadCell>
          <ListGridHeadCell>Descripción</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Creado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {roles.map((role) => (
            <ListGridRow key={role.id} columns={COLUMNS} onClick={() => router.push(roleRoutes.show(companyId, role.id))}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-primary-soft text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <ShieldCheck className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{role.name}</span>
                  <span className="text-muted-foreground truncate text-[12.5px] lg:hidden">
                    {PERMISSION_TYPE_LABELS[role.permissionType]}
                  </span>
                </div>
              </div>
              <div className="hidden lg:block">
                <Badge variant={role.permissionType === 'all' ? 'default' : 'secondary'}>
                  {PERMISSION_TYPE_LABELS[role.permissionType]}
                </Badge>
              </div>
              <div className="hidden min-w-0 lg:block">
                <span className="text-muted-foreground block truncate text-[13px]" title={role.description ?? ''}>
                  {role.description || '—'}
                </span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={role.status === 'inactive' ? 'inactivo' : 'activo'} />
              </div>
              <div className="text-muted-foreground hidden text-[13px] lg:block">{formatDateTime(role.createdAt)}</div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(roleRoutes.show(companyId, role.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {!role.isAdministrator && can(ROLE_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(roleRoutes.edit(companyId, role.id))}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {!role.isAdministrator && can(ROLE_PERMISSIONS.UPDATE_STATUS) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(role)}>
                          <Power className="mr-2 size-4" />
                          {role.status === 'active' ? 'Inactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {roles.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={roles.length} total={meta.total} noun="rol" nounPlural="roles">
          <ListPagination meta={meta} href={(query) => roleRoutes.index(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
