import type { Metadata } from 'next';
import { AuthShell } from '@/app/(auth)/_components/AuthShell';
import { LoginForm } from '@/app/(auth)/login/LoginForm';

export const metadata: Metadata = { title: 'Iniciar sesión' };

const STATUS_MESSAGES: Record<string, string> = {
  reset: 'Tu contraseña fue restablecida. Ya puedes iniciar sesión.',
  'logged-out': 'Cerraste sesión correctamente.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusMessage = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <AuthShell
      top="contact"
      brand={{
        title: 'Tu negocio de streaming, bajo control.',
        text: 'Clientes, perfiles, vencimientos y cobros — todo en un panel. Entra y sigue vendiendo con orden.',
        quote:
          '“Antes llevaba todo en cuadernos y notas del teléfono. Ahora sé al instante quién me debe y qué vence.”',
        quoteBy: 'Vendedor independiente, Santiago',
        showStats: true,
      }}
    >
      <h1>Bienvenido de vuelta</h1>
      <p className="sub">Ingresa tus datos para entrar a tu panel.</p>
      {statusMessage && <div className="auth-status ok">{statusMessage}</div>}
      <LoginForm />
    </AuthShell>
  );
}
