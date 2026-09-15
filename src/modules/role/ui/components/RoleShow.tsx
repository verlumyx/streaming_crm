import Link from 'next/link';
import { Edit, Info } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { StatusPill } from '@/components/status-pill';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { roleRoutes } from '@/modules/role/routes';
import type { RoleDto } from '@/modules/role/serializers/role.serializer';
import { PERMISSION_TYPE_LABELS, type PermissionTreeModuleDto } from '../types/Role';
import { RoleStatusButton } from './RoleStatusButton';

type Props = {
  companyId: string;
  role: RoleDto;
  modules: PermissionTreeModuleDto[];
  canUpdate: boolean;
  canUpdateStatus: boolean;
};

/** Ver: role data, audit dates and the granted permissions grouped by module. Server component. */
export function RoleShow({ companyId, role, modules, canUpdate, canUpdateStatus }: Props) {
  const granted = new Set(role.permissions);
  const grantedModules = modules
    .map((module) => ({ ...module, permissions: module.permissions.filter((p) => granted.has(p.action)) }))
    .filter((module) => module.permissions.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={roleRoutes.index(companyId)}>Roles</BackLink>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex flex-col gap-2">
          <h1 className="text-[27px] font-extrabold tracking-tight">{role.name}</h1>
          <div className="flex items-center gap-2">
            <StatusPill kind={role.status === 'inactive' ? 'inactivo' : 'activo'} />
            <Badge variant={role.permissionType === 'all' ? 'default' : 'secondary'}>
              {PERMISSION_TYPE_LABELS[role.permissionType]}
            </Badge>
          </div>
        </div>
        {!role.isAdministrator && (
          <div className="flex flex-wrap gap-2.5">
            {canUpdateStatus && <RoleStatusButton companyId={companyId} roleId={role.id} status={role.status} />}
            {canUpdate && (
              <Button asChild className="h-10 rounded-[11px] px-4 font-semibold">
                <Link href={roleRoutes.edit(companyId, role.id)}>
                  <Edit />
                  Editar
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card className="gap-4 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Información del Rol</div>
          <Field label="ID">
            <span className="bg-muted rounded px-2 py-1 font-mono text-[12.5px]">{role.id}</span>
          </Field>
          <Field label="Nombre">{role.name}</Field>
          <Field label="Tipo de permisos">{PERMISSION_TYPE_LABELS[role.permissionType]}</Field>
          <Field label="Estado">
            <StatusPill kind={role.status === 'inactive' ? 'inactivo' : 'activo'} />
          </Field>
          {role.description && (
            <Field label="Descripción">
              <span className="whitespace-pre-wrap">{role.description}</span>
            </Field>
          )}
        </Card>

        <Card className="gap-4 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Información de Auditoría</div>
          <Field label="Fecha de creación">{formatDateTime(role.createdAt)}</Field>
          {role.updatedAt && <Field label="Última actualización">{formatDateTime(role.updatedAt)}</Field>}
        </Card>
      </div>

      <Card className="gap-4 rounded-2xl p-5">
        <div className="text-base font-bold tracking-tight">Permisos</div>
        {role.permissionType === 'all' ? (
          <Alert>
            <Info />
            <AlertDescription>
              <p>
                Este rol tiene acceso a <strong>todos los permisos</strong>.
              </p>
            </AlertDescription>
          </Alert>
        ) : grantedModules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Este rol no tiene permisos asignados.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {grantedModules.map((module) => (
              <div key={module.id} className="flex flex-col gap-2 rounded-xl border p-4">
                <div className="text-sm font-bold">{module.label}</div>
                <ul className="text-muted-foreground flex flex-col gap-1 text-[13px]">
                  {module.permissions.map((permission) => (
                    <li key={permission.id}>{permission.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[12.5px] font-semibold">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
