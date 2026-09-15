'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Edit, Eye, MoreHorizontal, Plus, Power, Search } from 'lucide-react';
import { StatusPill } from '@/components/status-pill';
import {
  EmptyState,
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
import { formatDate } from '@/lib/format';
import { companyRoutes } from '@/modules/company/routes';
import { updateCompanyStatusAction } from '@/app/[companyId]/companies/actions';
import type { CompanyDto } from '@/modules/company/serializers/company.serializer';
import type { CompanyFilters, CompanyMeta } from '../types/Company';

const COLUMNS = 'lg:grid-cols-[2fr_0.9fr_2fr_1fr_0.8fr]';

type Props = { companyId: string; companies: CompanyDto[]; meta: CompanyMeta; filters: CompanyFilters };

/** Listar. The page is system-owner only, so every action is available. */
export function CompanyList({ companyId, companies, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<CompanyFilters>(initialFilters);

  const applyFilters = (next: CompanyFilters) => {
    setFilters(next);
    router.push(companyRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(companyRoutes.index(companyId));
  };

  const toggleStatus = (company: CompanyDto) => {
    startTransition(async () => {
      const result = await updateCompanyStatusAction(
        companyId,
        company.id,
        company.status === 'active' ? 'inactive' : 'active',
      );
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  const newCompanyButton = (label: string) => (
    <Button
      className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
      onClick={() => router.push(companyRoutes.create(companyId))}
    >
      <Plus />
      {label}
    </Button>
  );

  return (
    <PageShell
      title="Empresas"
      subtitle={`${meta.total} empresa${meta.total !== 1 ? 's' : ''} · gestiona las empresas del sistema`}
      actions={newCompanyButton('Nueva empresa')}
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="filter-name">Nombre</Label>
            <Input
              id="filter-name"
              type="text"
              placeholder="Buscar por nombre..."
              value={filters.name ?? ''}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters(filters)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <Select
              value={filters.status ?? 'todos'}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  status: value === 'todos' ? undefined : (value as CompanyFilters['status']),
                })
              }
            >
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
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
          <ListGridHeadCell>Empresa</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Descripción</ListGridHeadCell>
          <ListGridHeadCell>Creada</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {companies.map((company) => (
            <ListGridRow
              key={company.id}
              columns={COLUMNS}
              onClick={() => router.push(companyRoutes.show(companyId, company.id))}
            >
              <div className="flex items-center gap-3">
                <span className="bg-primary-soft text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Building2 className="size-5" />
                </span>
                <span className="truncate font-bold">{company.name}</span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={company.status === 'inactive' ? 'inactivo' : 'activo'} />
              </div>
              <div className="hidden min-w-0 lg:block">
                <span
                  className="text-muted-foreground block truncate text-[13px]"
                  title={company.description ?? ''}
                >
                  {company.description ?? '—'}
                </span>
              </div>
              <div className="hidden lg:block">
                <span className="text-muted-foreground text-[13px] font-medium">
                  {formatDate(company.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-card rounded-[10px]"
                      aria-label="Opciones"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(companyRoutes.show(companyId, company.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(companyRoutes.edit(companyId, company.id))}>
                      <Edit className="mr-2 size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(company)}>
                      <Power className="mr-2 size-4" />
                      {company.status === 'active' ? 'Inactivar' : 'Activar'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {companies.length === 0 && (
            <EmptyState
              icon={Building2}
              title="No se encontraron empresas."
              action={newCompanyButton('Crear primera empresa')}
            />
          )}
        </ListGridBody>
        <ListFooter shown={companies.length} total={meta.total} noun="empresa" />
      </ListGrid>
    </PageShell>
  );
}
