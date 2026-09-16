'use client';

import { useRouter } from 'next/navigation';
import { Check, Info, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { FormSectionHead } from '@/components/form-section-head';
import { cn } from '@/lib/utils';
import type { PermissionType } from '@/modules/role/models/role.model';
import { useRoleFormContext } from '../contexts/RoleFormContext';
import { PERMISSION_TYPE_LABELS } from '../types/Role';
import { RolePermissionsTree } from './RolePermissionsTree';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

export function RoleForm() {
  const router = useRouter();
  const { data, setData, modules, formAction, pending, errors, mode, isLocked } = useRoleFormContext();

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="permissionType" value={data.permissionType} />
      <input type="hidden" name="permissions" value={JSON.stringify(data.permissions)} />

      {isLocked && (
        <Alert>
          <Lock />
          <AlertDescription>El rol Administrador no se puede editar.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Información del Rol" sub="Nombre, tipo de permisos y descripción" />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-[13px] font-semibold">
                Nombre del rol *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                placeholder="Ingrese el nombre del rol"
                className={cn('h-[42px] rounded-[10px]', errors.name && 'border-bad')}
                maxLength={255}
                disabled={isLocked}
                required
              />
              <FieldError messages={errors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permission-type" className="text-[13px] font-semibold">
                Tipo de permisos *
              </Label>
              <SearchableSelect
                id="permission-type"
                options={[
                  { value: 'all', label: PERMISSION_TYPE_LABELS.all },
                  { value: 'custom', label: PERMISSION_TYPE_LABELS.custom },
                ]}
                value={data.permissionType}
                onChange={(value) => value && setData('permissionType', value as PermissionType)}
                disabled={isLocked}
                placeholder="Seleccione el tipo de permisos"
                emptyText="Sin resultados"
                aria-invalid={Boolean(errors.permissionType)}
                className={cn('h-[42px] rounded-[10px]', errors.permissionType && 'border-bad')}
              />
              <FieldError messages={errors.permissionType} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-[13px] font-semibold">
                Descripción
              </Label>
              <Textarea
                id="description"
                name="description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                placeholder="Ingrese una descripción del rol (opcional)"
                className={cn('rounded-[10px]', errors.description && 'border-bad')}
                maxLength={1000}
                rows={4}
                disabled={isLocked}
              />
              <FieldError messages={errors.description} />
            </div>
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={2} title="Permisos" sub="Acciones que podrá realizar este rol" />
          <div className="flex flex-col gap-4 p-5">
            {data.permissionType === 'all' ? (
              <Alert>
                <Info />
                <AlertDescription>
                  <p>
                    Este rol tiene acceso a <strong>todos los permisos</strong>. Cambia el tipo de permisos a
                    &quot;Personalizados&quot; para seleccionar permisos específicos.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">Selecciona los permisos específicos para este rol</p>
                <RolePermissionsTree
                  modules={modules}
                  selected={data.permissions}
                  onChange={(permissions) => setData('permissions', permissions)}
                  disabled={isLocked}
                />
              </>
            )}
            <FieldError messages={errors.permissions} />
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="bg-card h-10 rounded-[11px] px-4 font-semibold"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || isLocked}
          className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
        >
          <Check />
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear rol' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
