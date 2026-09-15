import type { Metadata } from 'next';
import { AppearanceTabs } from '@/components/appearance-tabs';
import { HeadingSmall } from '@/components/heading-small';

export const metadata: Metadata = { title: 'Configuración de apariencia' };

/** Apariencia (theme stored client-side by next-themes). */
export default async function SettingsAppearancePage() {
  return (
    <div className="space-y-6">
      <HeadingSmall title="Apariencia" description="Personaliza el aspecto visual de tu cuenta" />
      <AppearanceTabs />
    </div>
  );
}
