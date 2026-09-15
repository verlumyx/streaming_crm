'use client';

import { HeadingSmall } from '@/components/heading-small';
import { InputError } from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordFormContext } from '../contexts/PasswordFormContext';

export function PasswordForm() {
  const { data, setData, errors, pending, submit, recentlySuccessful, currentPasswordRef, passwordRef } =
    usePasswordFormContext();

  return (
    <div className="space-y-6">
      <HeadingSmall
        title="Actualizar contraseña"
        description="Asegúrate de que tu cuenta use una contraseña larga y aleatoria para mayor seguridad"
      />

      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="current_password">Contraseña actual</Label>
          <Input
            id="current_password"
            ref={currentPasswordRef}
            name="current_password"
            type="password"
            className="mt-1 block w-full"
            autoComplete="current-password"
            placeholder="Contraseña actual"
            value={data.currentPassword}
            onChange={(e) => setData('currentPassword', e.target.value)}
            aria-invalid={Boolean(errors.currentPassword)}
          />
          <InputError message={errors.currentPassword} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            ref={passwordRef}
            name="password"
            type="password"
            className="mt-1 block w-full"
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          <InputError message={errors.password} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            className="mt-1 block w-full"
            autoComplete="new-password"
            placeholder="Confirmar contraseña"
            value={data.passwordConfirmation}
            onChange={(e) => setData('passwordConfirmation', e.target.value)}
            aria-invalid={Boolean(errors.passwordConfirmation)}
          />
          <InputError message={errors.passwordConfirmation} />
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending} data-test="update-password-button">
            {pending ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
          {recentlySuccessful && <p className="text-muted-foreground text-sm">Guardado.</p>}
        </div>
      </form>
    </div>
  );
}
