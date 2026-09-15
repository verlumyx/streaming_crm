'use client';

import { HeadingSmall } from '@/components/heading-small';
import { InputError } from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfileFormContext } from '../contexts/ProfileFormContext';

export function ProfileForm() {
  const {
    profile,
    data,
    setData,
    formAction,
    pending,
    errors,
    recentlySuccessful,
    resendVerification,
    isSendingVerification,
    verificationLinkSent,
  } = useProfileFormContext();

  return (
    <div className="space-y-6">
      <HeadingSmall title="Información de perfil" description="Actualiza tu nombre y dirección de correo electrónico" />

      <form action={formAction} className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            name="name"
            className="mt-1 block w-full"
            value={data.name}
            onChange={(e) => setData('name', e.target.value)}
            required
            maxLength={255}
            autoComplete="name"
            placeholder="Nombre completo"
            aria-invalid={Boolean(errors.name)}
          />
          <InputError className="mt-2" message={errors.name?.[0]} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            className="mt-1 block w-full"
            value={data.email}
            onChange={(e) => setData('email', e.target.value)}
            required
            maxLength={255}
            autoComplete="username"
            placeholder="Correo electrónico"
            aria-invalid={Boolean(errors.email)}
          />
          <InputError className="mt-2" message={errors.email?.[0]} />
        </div>

        {!profile.emailVerified && (
          <div>
            <p className="text-muted-foreground -mt-4 text-sm">
              Tu dirección de correo no está verificada.{' '}
              <Button
                type="button"
                variant="link"
                className="text-foreground h-auto p-0 underline"
                onClick={resendVerification}
                disabled={isSendingVerification}
              >
                {isSendingVerification ? 'Enviando…' : 'Reenviar verificación'}
              </Button>
            </p>

            {verificationLinkSent && (
              <div className="mt-2 text-sm font-medium text-green-600">
                Se ha enviado un nuevo enlace de verificación a tu correo.
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending} data-test="update-profile-button">
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
          {recentlySuccessful && <p className="text-muted-foreground text-sm">Guardado.</p>}
        </div>
      </form>
    </div>
  );
}
