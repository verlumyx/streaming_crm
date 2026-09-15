'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit, Eye, MoreHorizontal, Plus, Power, Search } from 'lucide-react';
import { InitialsAvatar } from '@/components/initials-avatar';
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
import { formatDateTime } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import { USER_PERMISSIONS } from '@/modules/user/permissions';
import { userRoutes } from '@/modules/user/routes';
import { updateUserStatusAction } from '@/app/[companyId]/users/actions';
import type { UserDto } from '@/modules/user/serializers/user.serializer';
import type { UserFilters, UserMeta } from '../types/User';
import { UserRoleBadge } from './UserRoleBadge';
import { UserVerificationBadge } from './UserVerificationBadge';

const COLUMNS = 'lg:grid-cols-[2.2fr_1fr_1fr_0.8fr_1fr_0.6fr]';

const TEXT_FILTERS: Array<[keyof Omit<UserFilters, 'emailVerified'>, string]> = [
  ['name', 'Nombre'],
  ['email', 'Email'],
];

type Props = { companyId: string; users: UserDto[]; meta: UserMeta; filters: UserFilters };

export function UserList({ companyId, users, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<UserFilters>(initialFilters);

  const applyFilters = (next: UserFilters) => {
    setFilters(next);
    router.push(userRoutes.index(companyId, next));
  };

  const clearFilters = () => {
    setFilters({});
    router.push(userRoutes.index(companyId));
  };

  const toggleStatus = (user: UserDto) => {
    startTransition(async () => {
      const result = await updateUserStatusAction(companyId, user.id, user.status === 'active' ? 'inactive' : 'active');
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });
  };

  return (
    <PageShell
      title="Usuarios"
      subtitle={`${meta.total} usuario${meta.total !== 1 ? 's' : ''} con acceso a esta empresa`}
      actions={
        can(USER_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(userRoutes.create(companyId))}
          >
            <Plus />
            Nuevo usuario
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
            <Label htmlFor="filter-email-verified">Estado email</Label>
            <Select
              value={filters.emailVerified ?? 'all'}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  emailVerified: value === 'all' ? undefined : (value as UserFilters['emailVerified']),
                })
              }
            >
              <SelectTrigger id="filter-email-verified" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Verificado</SelectItem>
                <SelectItem value="unverified">No verificado</SelectItem>
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
          <ListGridHeadCell>Usuario</ListGridHeadCell>
          <ListGridHeadCell>Verificación</ListGridHeadCell>
          <ListGridHeadCell>Rol</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Creado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {users.map((user) => (
            <ListGridRow key={user.id} columns={COLUMNS} onClick={() => router.push(userRoutes.show(companyId, user.id))}>
              <div className="flex min-w-0 items-center gap-3">
                <InitialsAvatar name={user.name} size={40} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{user.name}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{user.email}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <UserVerificationBadge verified={user.emailVerified} />
              </div>
              <div className="hidden lg:block">
                <UserRoleBadge role={user.role} />
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={user.status === 'inactive' ? 'inactivo' : 'activo'} />
              </div>
              <div className="text-muted-foreground hidden text-[13px] lg:block">{formatDateTime(user.createdAt)}</div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(userRoutes.show(companyId, user.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {can(USER_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(userRoutes.edit(companyId, user.id))}>
                        <Edit className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {can(USER_PERMISSIONS.UPDATE_STATUS) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={pending} onSelect={() => toggleStatus(user)}>
                          <Power className="mr-2 size-4" />
                          {user.status === 'active' ? 'Inactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {users.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={users.length} total={meta.total} noun="usuario">
          <ListPagination meta={meta} href={(query) => userRoutes.index(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
