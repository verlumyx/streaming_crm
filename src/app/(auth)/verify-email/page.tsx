import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/app/(auth)/_components/AuthShell';
import { MailIcon } from '@/app/(auth)/_components/AuthIcons';
import { VerifyEmailForm } from '@/app/(auth)/verify-email/VerifyEmailForm';
import { auth } from '@/lib/auth';

export const metadata: Metadata = { title: 'Verificar correo' };

export default async function VerifyEmailPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  if (session.user.emailVerified) redirect('/dashboard');

  return (
    <AuthShell
      brand={{
        title: 'Confirma que este correo es tuyo.',
        text: 'Solo toma un minuto y nos permite avisarte de vencimientos, cobros y alertas importantes de tu negocio.',
        quote: '“Las alertas por correo me salvaron más de una venta perdida.”',
        quoteBy: 'Revendedora, Antofagasta',
      }}
    >
      <div className="auth-icon">
        <MailIcon strokeWidth={1.7} />
      </div>
      <h1>Verifica tu correo</h1>
      <p className="sub">
        Te enviamos un enlace de verificación a <strong>{session.user.email}</strong>. Ábrelo para
        confirmar tu cuenta y continuar.
      </p>
      <VerifyEmailForm email={session.user.email} />
    </AuthShell>
  );
}
