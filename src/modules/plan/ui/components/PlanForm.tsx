'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSectionHead } from '@/components/form-section-head';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PLAN_CAPACITIES, PLAN_DURATIONS, type PlanCapacity } from '@/modules/plan/models/plan.model';
import { usePlanFormContext } from '../contexts/PlanFormContext';
import { PLAN_CAPACITY_LABELS, planDurationLabel } from '../plan-labels';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

export function PlanForm() {
  const router = useRouter();
  const { data, setData, formAction, pending, errors, mode, services } = usePlanFormContext();
  const hasServices = services.length > 0;

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}
      {/* Selects and formatted inputs are controlled; the raw values travel in hidden inputs. */}
      <input type="hidden" name="serviceId" value={data.serviceId} />
      <input type="hidden" name="capacity" value={data.capacity} />
      <input type="hidden" name="durationDays" value={String(data.durationDays)} />
      <input type="hidden" name="salePrice" value={String(data.salePrice)} />
      <input type="hidden" name="roiTargetPct" value={String(data.roiTargetPct)} />

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Datos del plan" sub="Plan vendible construido sobre un servicio del catálogo" />
          <div className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-id" className="text-[13px] font-semibold">
                  Servicio *
                </Label>
                <Select
                  value={data.serviceId || undefined}
                  onValueChange={(value) => setData('serviceId', value)}
                  disabled={!hasServices}
                >
                  <SelectTrigger
                    id="service-id"
                    className={cn('h-[42px] w-full rounded-[10px]', errors.serviceId && 'border-bad')}
                  >
                    <SelectValue placeholder={hasServices ? 'Selecciona un servicio' : 'Sin servicios activos'} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError messages={errors.serviceId} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-[13px] font-semibold">
                  Nombre del plan *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="Ej. Netflix Mensual"
                  className={cn('h-[42px] rounded-[10px]', errors.name && 'border-bad')}
                  maxLength={150}
                  required
                />
                <FieldError messages={errors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capacity" className="text-[13px] font-semibold">
                  Capacidad *
                </Label>
                <Select value={data.capacity} onValueChange={(value) => setData('capacity', value as PlanCapacity)}>
                  <SelectTrigger
                    id="capacity"
                    className={cn('h-[42px] w-full rounded-[10px]', errors.capacity && 'border-bad')}
                  >
                    <SelectValue placeholder="Capacidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_CAPACITIES.map((capacity) => (
                      <SelectItem key={capacity} value={capacity}>
                        {PLAN_CAPACITY_LABELS[capacity]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError messages={errors.capacity} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="duration-days" className="text-[13px] font-semibold">
                  Duración *
                </Label>
                <Select
                  value={String(data.durationDays)}
                  onValueChange={(value) => setData('durationDays', Number(value))}
                >
                  <SelectTrigger
                    id="duration-days"
                    className={cn('h-[42px] w-full rounded-[10px]', errors.durationDays && 'border-bad')}
                  >
                    <SelectValue placeholder="Selecciona una duración" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_DURATIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {planDurationLabel(days)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError messages={errors.durationDays} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sale-price" className="text-[13px] font-semibold">
                  Precio de venta *
                </Label>
                <CurrencyInput
                  id="sale-price"
                  min={0}
                  decimals={2}
                  value={data.salePrice}
                  onValueChange={(value) => setData('salePrice', value)}
                  className={cn('h-[42px] rounded-[10px]', errors.salePrice && 'border-bad')}
                  required
                />
                <FieldError messages={errors.salePrice} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="roi-target-pct" className="text-[13px] font-semibold">
                  Meta ROI (%) *
                </Label>
                <NumberInput
                  id="roi-target-pct"
                  min={0}
                  decimals={2}
                  value={data.roiTargetPct}
                  onValueChange={(value) => setData('roiTargetPct', value)}
                  className={cn('h-[42px] rounded-[10px]', errors.roiTargetPct && 'border-bad')}
                  required
                />
                <FieldError messages={errors.roiTargetPct} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="gap-3.5 rounded-2xl p-5 xl:sticky xl:top-[86px]">
        <div className="text-base font-bold tracking-tight">Resumen</div>
        <div className="flex flex-col gap-2.5">
          <SummaryRow label="Plan">{data.name || (mode === 'create' ? 'Nuevo' : '—')}</SummaryRow>
          <SummaryRow label="Capacidad">{PLAN_CAPACITY_LABELS[data.capacity]}</SummaryRow>
          <SummaryRow label="Duración">{planDurationLabel(data.durationDays)}</SummaryRow>
          <SummaryRow label="Meta ROI">{data.roiTargetPct}%</SummaryRow>
          <div className="border-input flex items-center justify-between border-t border-dashed pt-2.5 text-[15px]">
            <span className="text-muted-foreground font-medium">Precio de venta</span>
            <b className="font-bold tabular-nums">{money(data.salePrice)}</b>
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending || !hasServices}
          className="h-10 w-full justify-center rounded-[11px] font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
        >
          <Check />
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear plan' : 'Guardar cambios'}
        </Button>
        {!hasServices && (
          <p className="text-muted-foreground text-xs">Primero crea un servicio activo para poder armar un plan.</p>
        )}
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

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13.5px]">
      <span className="text-muted-foreground font-medium">{label}</span>
      <b className="font-bold tabular-nums">{children}</b>
    </div>
  );
}
