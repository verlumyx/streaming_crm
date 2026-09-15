import type { Metadata } from 'next';
import { AuthShell } from '@/app/(auth)/_components/AuthShell';
import { ForgotPasswordForm } from '@/app/(auth)/forgot-password/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      brand={{
        title: 'Recuperar el acceso es rápido.',
        text: 'Te enviaremos un enlace seguro para crear una contraseña nueva y volver a tu panel en minutos.',
        quote: '“El soporte y la recuperación de cuenta nunca me han dejado tirado. Todo simple.”',
        quoteBy: 'Revendedor Pro',
      }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
