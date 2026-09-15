import type { Metadata } from 'next';
import { PasswordEdit } from '@/modules/settings/ui/components/PasswordEdit';

export const metadata: Metadata = { title: 'Configuración de contraseña' };

/** Contraseña. The change runs through better-auth (`authClient.changePassword`). */
export default async function SettingsPasswordPage() {
  return <PasswordEdit />;
}
