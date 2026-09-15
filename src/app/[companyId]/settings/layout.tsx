import type { ReactNode } from 'react';
import { Heading } from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { SettingsNav } from '@/modules/settings/ui/components/SettingsNav';

type Props = { children: ReactNode; params: Promise<{ companyId: string }> };

/** Settings sub-layout. Membership and session are already enforced by `[companyId]/layout.tsx`. */
export default async function SettingsLayout({ children, params }: Props) {
  const { companyId } = await params;

  return (
    <div className="px-4 py-6 sm:px-6">
      <Heading title="Configuración" description="Administra tu perfil y las configuraciones de tu cuenta" />

      <div className="flex flex-col lg:flex-row lg:space-x-12">
        <aside className="w-full max-w-xl lg:w-56">
          <SettingsNav companyId={companyId} />
        </aside>

        <Separator className="my-6 lg:hidden" />

        <div className="flex-1 md:max-w-2xl">
          <section className="max-w-xl space-y-12">{children}</section>
        </div>
      </div>
    </div>
  );
}
