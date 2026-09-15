'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { settingsRoutes, type SettingsSection } from '@/modules/settings/routes';

const NAV_ITEMS: { section: SettingsSection; title: string }[] = [
  { section: 'profile', title: 'Perfil' },
  { section: 'password', title: 'Contraseña' },
  { section: 'two-factor', title: 'Autenticación de dos factores' },
  { section: 'appearance', title: 'Apariencia' },
  { section: 'company', title: 'Empresa predeterminada' },
];

export function SettingsNav({ companyId }: { companyId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1" aria-label="Configuración">
      {NAV_ITEMS.map((item) => {
        const href = settingsRoutes.section(companyId, item.section);
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Button
            key={item.section}
            size="sm"
            variant="ghost"
            asChild
            className={cn('w-full justify-start', isActive && 'bg-muted')}
          >
            <Link href={href} aria-current={isActive ? 'page' : undefined}>
              {item.title}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
