import Link from 'next/link';
import { Building2, Calendar, Clock, Edit, Mail, UserCircle } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { InitialsAvatar } from '@/components/initials-avatar';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { userRoutes } from '@/modules/user/routes';
import type { UserDto } from '@/modules/user/serializers/user.serializer';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusButton } from './UserStatusButton';
import { UserVerificationBadge } from './UserVerificationBadge';

type Props = { companyId: string; user: UserDto; canUpdate: boolean; canUpdateStatus: boolean };

/** Ver: global user data plus its membership (company, role, status) in the current company. Server component. */
export function UserShow({ companyId, user, canUpdate, canUpdateStatus }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={userRoutes.index(companyId)}>Usuarios</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <InitialsAvatar name={user.name} size={64} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{user.name}</h1>
              <StatusPill kind={user.status === 'inactive' ? 'inactivo' : 'activo'} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                <Mail className="size-3.5 opacity-80" />
                {user.email}
              </span>
              <UserVerificationBadge verified={user.emailVerified} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {canUpdateStatus && <UserStatusButton companyId={companyId} userId={user.id} status={user.status} />}
          {canUpdate && (
            <Button asChild className="h-10 rounded-[11px] px-4 font-semibold">
              <Link href={userRoutes.edit(companyId, user.id)}>
                <Edit />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card className="gap-4 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Información básica</div>
          <Field label="ID">
            <span className="bg-muted rounded px-2 py-1 font-mono text-[12.5px]">{user.id}</span>
          </Field>
          <Field label="Nombre">{user.name}</Field>
          <Field label="Email">{user.email}</Field>
          <Field label="Empresa" icon={<Building2 className="size-3.5" />}>
            {user.companyName}
          </Field>
          <Field label="Rol" icon={<UserCircle className="size-3.5" />}>
            <UserRoleBadge role={user.role} />
          </Field>
        </Card>

        <Card className="gap-4 rounded-2xl p-5">
          <div className="text-base font-bold tracking-tight">Estado y fechas</div>
          <Field label="Verificación del email">
            <UserVerificationBadge verified={user.emailVerified} />
          </Field>
          <Field label="Estado en la empresa">
            <StatusPill kind={user.status === 'inactive' ? 'inactivo' : 'activo'} />
          </Field>
          <Field label="Fecha de registro" icon={<Calendar className="size-3.5" />}>
            {formatDateTime(user.createdAt)}
          </Field>
          {user.updatedAt && (
            <Field label="Última actualización" icon={<Clock className="size-3.5" />}>
              {formatDateTime(user.updatedAt)}
            </Field>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
        {icon}
        {label}
      </span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
