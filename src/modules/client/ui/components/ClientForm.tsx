'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormSectionHead } from '@/components/form-section-head';
import { COUNTRY_CODES, joinPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { useClientFormContext } from '../contexts/ClientFormContext';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

export function ClientForm() {
  const router = useRouter();
  const { data, setData, formAction, pending, errors, mode } = useClientFormContext();

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="phone" value={joinPhone(data.phonePrefix, data.phone)} />

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Datos del cliente" sub="Información de contacto" />
          <div className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-[13px] font-semibold">
                  Nombre completo *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="Ej. Camila Rojas"
                  className={cn('h-[42px] rounded-[10px]', errors.name && 'border-bad')}
                  maxLength={150}
                  required
                />
                <FieldError messages={errors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone-number" className="text-[13px] font-semibold">
                  Teléfono / WhatsApp *
                </Label>
                <div className="flex gap-2">
                  <select
                    value={data.phonePrefix}
                    onChange={(e) => setData('phonePrefix', e.target.value)}
                    aria-label="Prefijo de país"
                    className="border-input bg-card focus:border-primary focus:ring-primary-soft h-[42px] shrink-0 rounded-[10px] border px-2 text-sm outline-none focus:ring-[3px]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.name} value={c.dial}>
                        {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                  <Input
                    id="phone-number"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    placeholder="412 1234567"
                    className={cn('h-[42px] min-w-0 flex-1 rounded-[10px]', errors.phone && 'border-bad')}
                    maxLength={20}
                    required
                  />
                </div>
                <FieldError messages={errors.phone} />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="email" className="text-[13px] font-semibold">
                  Correo
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className={cn('h-[42px] rounded-[10px]', errors.email && 'border-bad')}
                  maxLength={255}
                />
                <FieldError messages={errors.email} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-[13px] font-semibold">
                Nota (opcional)
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={data.notes}
                onChange={(e) => setData('notes', e.target.value)}
                placeholder="Preferencias de pago, referido por…"
                className={cn('rounded-[10px]', errors.notes && 'border-bad')}
                rows={3}
              />
              <FieldError messages={errors.notes} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="gap-3.5 rounded-2xl p-5 xl:sticky xl:top-[86px]">
        <div className="text-base font-bold tracking-tight">Resumen</div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-muted-foreground font-medium">Cliente</span>
            <b className="font-bold">{data.name || (mode === 'create' ? 'Nuevo' : '—')}</b>
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full justify-center rounded-[11px] font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
        >
          <Check />
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
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
