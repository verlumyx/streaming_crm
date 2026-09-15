'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FormSectionHead } from '@/components/form-section-head';
import { cn } from '@/lib/utils';
import { useUserFormContext } from '../contexts/UserFormContext';

function FieldError({ messages }: { messages?: string[] | null }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

const FIELD = 'h-[42px] rounded-[10px]';
const PRIMARY = 'h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]';
const SECONDARY = 'bg-card h-10 rounded-[11px] px-4 font-semibold';

export function UserForm() {
  const { emailStep } = useUserFormContext();
  return emailStep ? <UserEmailStep /> : <UserDataStep />;
}

/** Crear — step 1: only the email; checks whether the user already exists. */
function UserEmailStep() {
  const router = useRouter();
  const { data, handleEmailCheck, isCheckingEmail, alreadyInCompany, emailError } = useUserFormContext();
  const [emailInput, setEmailInput] = useState(data.email);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleEmailCheck(emailInput);
      }}
      className="flex max-w-2xl flex-col gap-5"
    >
      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <FormSectionHead step={1} title="Email" sub="Verificamos si el usuario ya existe en el sistema" />
        <div className="flex flex-col gap-1.5 p-5">
          <Label htmlFor="check-email" className="text-[13px] font-semibold">
            Email *
          </Label>
          <Input
            id="check-email"
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Ingresa el email"
            className={cn(FIELD, (alreadyInCompany || emailError) && 'border-bad')}
            maxLength={255}
            autoFocus
            required
          />
          {alreadyInCompany && <FieldError messages={['Este usuario ya tiene acceso a esta empresa.']} />}
          {emailError && <FieldError messages={[emailError]} />}
        </div>
      </Card>

      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="outline" className={SECONDARY} onClick={() => router.back()} disabled={isCheckingEmail}>
          Cancelar
        </Button>
        <Button type="submit" className={PRIMARY} disabled={isCheckingEmail || !emailInput.trim()}>
          <ArrowRight />
          {isCheckingEmail ? 'Verificando…' : 'Continuar'}
        </Button>
      </div>
    </form>
  );
}

/** Crear — step 2, or Editar: user data, password (new users / optional on edit) and role. */
function UserDataStep() {
  const router = useRouter();
  const { mode, data, setData, roles, formAction, pending, errors, existingUser, handleChangeEmail } =
    useUserFormContext();

  const isCreate = mode === 'create';
  const showPassword = !existingUser;
  const roleOptions = roles.map((role) => ({ value: role.id, label: role.name }));

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {isCreate && <input type="hidden" name="id" value={data.id} />}
      {isCreate && <input type="hidden" name="existingUserId" value={data.existingUserId} />}

      {existingUser && (
        <Alert>
          <Info />
          <AlertDescription>
            <p>Este usuario ya existe en el sistema. Al guardar, se le dará acceso a esta empresa.</p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <FormSectionHead
          step={isCreate ? 2 : 1}
          title="Información del usuario"
          sub={isCreate ? 'Datos de acceso y rol en esta empresa' : 'Datos globales del usuario y su rol en esta empresa'}
        />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-[13px] font-semibold">
              Email {isCreate ? '' : '*'}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              readOnly={isCreate}
              className={cn(FIELD, isCreate && 'bg-muted', errors.email && 'border-bad')}
              maxLength={255}
              required
            />
            {isCreate && (
              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-muted-foreground hover:text-foreground w-max text-xs underline underline-offset-2"
              >
                Cambiar email
              </button>
            )}
            <FieldError messages={errors.email} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-[13px] font-semibold">
              Nombre {existingUser ? '' : '*'}
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={data.name}
              onChange={(e) => setData('name', e.target.value)}
              placeholder="Ingresa el nombre"
              className={cn(FIELD, errors.name && 'border-bad')}
              maxLength={255}
              disabled={Boolean(existingUser)}
              required={!existingUser}
            />
            <FieldError messages={errors.name} />
          </div>

          {showPassword && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-[13px] font-semibold">
                  {isCreate ? 'Contraseña *' : 'Nueva contraseña'}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  placeholder={isCreate ? 'Ingresa la contraseña' : 'Déjala vacía para no cambiarla'}
                  className={cn(FIELD, errors.password && 'border-bad')}
                  minLength={8}
                  required={isCreate}
                />
                <FieldError messages={errors.password} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="passwordConfirmation" className="text-[13px] font-semibold">
                  {isCreate ? 'Confirmar contraseña *' : 'Confirmar nueva contraseña'}
                </Label>
                <Input
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  value={data.passwordConfirmation}
                  onChange={(e) => setData('passwordConfirmation', e.target.value)}
                  placeholder="Vuelve a ingresar la contraseña"
                  className={cn(FIELD, errors.passwordConfirmation && 'border-bad')}
                  minLength={8}
                  required={isCreate}
                />
                <FieldError messages={errors.passwordConfirmation} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roleId" className="text-[13px] font-semibold">
              Rol
            </Label>
            <SearchableSelect
              id="roleId"
              name="roleId"
              options={roleOptions}
              value={data.roleId || null}
              onChange={(value) => setData('roleId', value ?? '')}
              placeholder="Selecciona el rol"
              searchPlaceholder="Buscar rol..."
              emptyText="No hay roles activos"
              clearable
              className={cn(FIELD, errors.roleId && 'border-bad')}
              aria-invalid={Boolean(errors.roleId)}
            />
            <FieldError messages={errors.roleId} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="outline" className={SECONDARY} onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" className={PRIMARY} disabled={pending}>
          <Check />
          {pending ? 'Guardando…' : !isCreate ? 'Guardar cambios' : existingUser ? 'Dar acceso' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}
