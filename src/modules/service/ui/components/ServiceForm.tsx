'use client';

import { useRouter } from 'next/navigation';
import { Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { FormSectionHead } from '@/components/form-section-head';
import { cn } from '@/lib/utils';
import { useServiceFormContext } from '../contexts/ServiceFormContext';
import { ServiceLogo } from './ServiceLogo';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

export function ServiceForm() {
  const router = useRouter();
  const { data, setData, formAction, pending, errors, mode } = useServiceFormContext();

  const setMaxProfiles = (value: number) => setData('maxProfiles', Math.max(1, Math.trunc(value) || 1));

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="maxProfiles" value={String(data.maxProfiles)} />

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Datos del servicio" sub="Plataforma o servicio de streaming del catálogo" />
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
                placeholder="Ej. Netflix"
                className={cn('h-[42px] rounded-[10px]', errors.name && 'border-bad')}
                maxLength={100}
                required
              />
              <FieldError messages={errors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="logoUrl" className="text-[13px] font-semibold">
                URL del logo
              </Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="text"
                value={data.logoUrl}
                onChange={(e) => setData('logoUrl', e.target.value)}
                placeholder="https://…/logo.png"
                className={cn('h-[42px] rounded-[10px]', errors.logoUrl && 'border-bad')}
                maxLength={255}
              />
              <FieldError messages={errors.logoUrl} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max-profiles" className="text-[13px] font-semibold">
                Máximo de perfiles *
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="bg-card size-[42px] shrink-0 rounded-[10px]"
                  onClick={() => setMaxProfiles(data.maxProfiles - 1)}
                  disabled={data.maxProfiles <= 1}
                  aria-label="Disminuir"
                >
                  <Minus className="size-4" />
                </Button>
                <NumberInput
                  id="max-profiles"
                  min={1}
                  value={data.maxProfiles}
                  onValueChange={setMaxProfiles}
                  className={cn('h-[42px] w-24 rounded-[10px] text-center', errors.maxProfiles && 'border-bad')}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="bg-card size-[42px] shrink-0 rounded-[10px]"
                  onClick={() => setMaxProfiles(data.maxProfiles + 1)}
                  aria-label="Aumentar"
                >
                  <Plus className="size-4" />
                </Button>
                <span className="text-muted-foreground text-[13px]">perfiles por cuenta</span>
              </div>
              <FieldError messages={errors.maxProfiles} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="gap-3.5 rounded-2xl p-5 xl:sticky xl:top-[86px]">
        <div className="text-base font-bold tracking-tight">Resumen</div>
        <div className="flex items-center gap-3">
          <ServiceLogo name={data.name} logoUrl={data.logoUrl || null} className="size-12 rounded-[12px]" />
          <div className="flex min-w-0 flex-col">
            <b className="truncate font-bold">{data.name || (mode === 'create' ? 'Nuevo' : '—')}</b>
            <span className="text-muted-foreground text-[12.5px]">
              {data.maxProfiles} perfil{data.maxProfiles !== 1 ? 'es' : ''} máx.
            </span>
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full justify-center rounded-[11px] font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
        >
          <Check />
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear servicio' : 'Guardar cambios'}
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
