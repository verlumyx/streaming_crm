import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/app/(auth)/_components/AuthShell';
import { LockKeyIcon } from '@/app/(auth)/_components/AuthIcons';
import { ResetPasswordForm } from '@/app/(auth)/reset-password/ResetPasswordForm';

export const metadata: Metadata = { title: 'Restablecer contraseña' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const isTokenValid = Boolean(token) && error !== 'INVALID_TOKEN';

  return (
    <AuthShell
      brand={{
        title: 'Crea una contraseña nueva y segura.',
        text: 'Elige una clave fuerte para proteger tus clientes, cuentas y cobros. Después podrás entrar con normalidad.',
        quote: '“Mis datos de clientes son mi negocio. Me importa que estén bien protegidos.”',
        quoteBy: 'Revendedora, Concepción',
      }}
    >
      <div className="auth-icon">
        <LockKeyIcon />
      </div>
      {isTokenValid && token ? (
        <>
          <h1>Crea tu nueva contraseña</h1>
          <p className="sub">Debe ser distinta a las anteriores. Te recomendamos una clave fuerte.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <>
          <h1>Enlace no válido</h1>
          <p className="sub">
            El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo para continuar.
          </p>
          <Link className="btn btn-brand btn-block btn-lg" href="/forgot-password" style={{ marginTop: 26 }}>
            Solicitar un nuevo enlace
          </Link>
          <p className="alt-foot">
            ¿Recordaste tu contraseña? <Link href="/login">Inicia sesión</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
