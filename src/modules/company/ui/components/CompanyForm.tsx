'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormSectionHead } from '@/components/form-section-head';
import { cn } from '@/lib/utils';
import { useCompanyFormContext } from '../contexts/CompanyFormContext';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

export function CompanyForm() {
  const router = useRouter();
  const { data, setData, formAction, pending, errors, mode } = useCompanyFormContext();

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Información de la empresa" sub="Nombre y descripción" />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-[13px] font-semibold">
                Nombre *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                placeholder="Nombre de la empresa"
                className={cn('h-[42px] rounded-[10px]', errors.name && 'border-bad')}
                maxLength={255}
                required
              />
              <FieldError messages={errors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-[13px] font-semibold">
                Descripción (opcional)
              </Label>
              <Textarea
                id="description"
                name="description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                placeholder="Descripción de la empresa"
                className={cn('rounded-[10px]', errors.description && 'border-bad')}
                rows={4}
              />
              <FieldError messages={errors.description} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="gap-3.5 rounded-2xl p-5 xl:sticky xl:top-[86px]">
        <div className="text-base font-bold tracking-tight">Resumen</div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="text-muted-foreground font-medium">Empresa</span>
            <b className="truncate font-bold">{data.name || (mode === 'create' ? 'Nueva' : '—')}</b>
          </div>
          {mode === 'create' && (
            <p className="text-muted-foreground text-[12.5px] leading-relaxed">
              Se creará el rol Administrador, quedarás como miembro con esa empresa por defecto y se cargarán
              los servicios de streaming predeterminados.
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full justify-center rounded-[11px] font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
        >
          <Check />
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear empresa' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="bg-card h-10 w-full justify-center rounded-[11px] font-semibold"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
      </Card>
    </form>
  );
}
