import type { Metadata } from 'next';
import { AuthShell } from '@/app/(auth)/_components/AuthShell';
import { ShieldIcon } from '@/app/(auth)/_components/AuthIcons';
import { TwoFactorForm } from '@/app/(auth)/two-factor/TwoFactorForm';

export const metadata: Metadata = { title: 'Verificación en dos pasos' };

export default function TwoFactorPage() {
  return (
    <AuthShell
      brand={{
        title: 'Un paso más para proteger tu cuenta.',
        text: 'La verificación en dos pasos mantiene a salvo tus clientes, cuentas y cobros aunque alguien conozca tu contraseña.',
        quote: '“Con la doble verificación duermo tranquilo: nadie entra a mi panel sin mi teléfono.”',
        quoteBy: 'Revendedor, Valparaíso',
      }}
    >
      <div className="auth-icon">
        <ShieldIcon />
      </div>
      <TwoFactorForm />
    </AuthShell>
  );
}
