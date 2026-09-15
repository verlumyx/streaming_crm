'use client';

import { Building2, Star } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { HeadingSmall } from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { setDefaultCompanyAction } from '@/app/[companyId]/settings/actions';
import type { SettingsCompanyDto } from '@/modules/settings/serializers/settings-company.serializer';

type Props = { companyId: string; companies: SettingsCompanyDto[] };

export function DefaultCompanyList({ companyId, companies }: Props) {
  const [pending, startTransition] = useTransition();
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);

  const handleSetDefault = (targetCompanyId: string) => {
    setPendingCompanyId(targetCompanyId);
    startTransition(async () => {
      const result = await setDefaultCompanyAction(companyId, targetCompanyId);
      // On success the action redirects back here and <FlashToaster /> shows the flash.
      if (result?.status === 'error') toast.error(result.message ?? 'No pudimos actualizar la empresa predeterminada.');
      setPendingCompanyId(null);
    });
  };

  return (
    <div className="space-y-6">
      <HeadingSmall
        title="Empresa predeterminada"
        description="Selecciona la empresa que se cargará automáticamente al iniciar sesión"
      />

      {companies.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tienes empresas asignadas.</p>
      ) : (
        <div className="space-y-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                company.isDefault ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <Building2
                className={cn('h-5 w-5 shrink-0', company.isDefault ? 'text-primary' : 'text-muted-foreground')}
              />
              <span className={cn('flex-1 text-sm font-medium', company.isDefault && 'text-primary')}>
                {company.name}
              </span>

              {company.isDefault ? (
                <Star className="fill-primary text-primary h-4 w-4" aria-label="Empresa predeterminada" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleSetDefault(company.id)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Star className="h-4 w-4" />
                  {pendingCompanyId === company.id ? 'Guardando…' : 'Establecer como predeterminada'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        La empresa marcada con <Star className="fill-primary text-primary inline h-3 w-3" /> se cargará
        automáticamente al iniciar sesión.
      </p>
    </div>
  );
}
