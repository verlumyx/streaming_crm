'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormSectionHead } from '@/components/form-section-head';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EXCHANGE_RATE_MAX_AGE_HOURS } from '@/modules/bot/domain/exchange-rate';
import { useBotSettingsFormContext } from '../contexts/BotSettingsFormContext';

/** Same rule the assistant applies at runtime, so the console never claims a rate the bot won't use. */
function isRateStale(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() > EXCHANGE_RATE_MAX_AGE_HOURS * 3_600_000;
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[10px] border p-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-semibold">
          {label}
        </Label>
        <p className="text-muted-foreground mt-0.5 text-[13px]">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function NumberField({
  id,
  name,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  error,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  error?: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className={cn('h-[42px] rounded-[10px]', error && 'border-bad')}
        required
      />
      {hint && <p className="text-muted-foreground text-[13px]">{hint}</p>}
      <FieldError messages={error} />
    </div>
  );
}

export function BotSettingsForm() {
  const { data, setData, formAction, pending, errors, settings } = useBotSettingsFormContext();
  const rateStale = isRateStale(settings.exchangeRateUpdatedAt);

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
      {/* The switches are rendered by Radix, which does not submit a native input. */}
      <input type="hidden" name="status" value={data.enabled ? 'active' : 'inactive'} />
      <input type="hidden" name="handoffEnabled" value={data.handoffEnabled ? 'on' : ''} />
      <input type="hidden" name="autoCreateClient" value={data.autoCreateClient ? 'on' : ''} />
      <input type="hidden" name="autoCreateSale" value={data.autoCreateSale ? 'on' : ''} />

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Asistente" sub="Identidad y tono con el que atiende" />
          <div className="flex flex-col gap-4 p-5">
            <Toggle
              id="enabled"
              label="Asistente activo"
              hint="Mientras esté inactivo, los mensajes entrantes se guardan pero nadie responde automáticamente."
              checked={data.enabled}
              onChange={(v) => setData('enabled', v)}
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assistantName" className="text-[13px] font-semibold">
                Nombre del asistente *
              </Label>
              <Input
                id="assistantName"
                name="assistantName"
                value={data.assistantName}
                onChange={(e) => setData('assistantName', e.target.value)}
                placeholder="Ej. Sofía"
                maxLength={100}
                className={cn('h-[42px] rounded-[10px]', errors.assistantName && 'border-bad')}
                required
              />
              <FieldError messages={errors.assistantName} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="personaPrompt" className="text-[13px] font-semibold">
                Instrucciones del negocio
              </Label>
              <Textarea
                id="personaPrompt"
                name="personaPrompt"
                value={data.personaPrompt}
                onChange={(e) => setData('personaPrompt', e.target.value)}
                placeholder="Ej. Trata de tú, ofrece siempre el plan mensual primero y menciona el descuento por dos cuentas."
                rows={6}
                maxLength={4000}
                className={cn('rounded-[10px]', errors.personaPrompt && 'border-bad')}
              />
              <p className="text-muted-foreground text-[13px]">
                Se añaden al prompt del sistema, por debajo de las reglas de seguridad: nunca pueden darle acceso a
                datos de otra empresa ni a las credenciales de las cuentas.
              </p>
              <FieldError messages={errors.personaPrompt} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentInstructions" className="text-[13px] font-semibold">
                Instrucciones de pago
              </Label>
              <Textarea
                id="paymentInstructions"
                name="paymentInstructions"
                value={data.paymentInstructions}
                onChange={(e) => setData('paymentInstructions', e.target.value)}
                placeholder="Ej. Pago Móvil 0102 — J-12345678 — 0412 1234567. Envía el comprobante por aquí."
                rows={4}
                maxLength={2000}
                className={cn('rounded-[10px]', errors.paymentInstructions && 'border-bad')}
              />
              <p className="text-muted-foreground text-[13px]">
                Es lo que responde al registrar la venta, que queda <strong>Por aprobar</strong> hasta que verifiques el
                pago.
              </p>
              <FieldError messages={errors.paymentInstructions} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exchangeRate" className="text-[13px] font-semibold">
                Tasa de cambio (Bs por dólar)
              </Label>
              <Input
                id="exchangeRate"
                name="exchangeRate"
                inputMode="decimal"
                value={data.exchangeRate}
                onChange={(e) => setData('exchangeRate', e.target.value)}
                placeholder="Ej. 240,50"
                className={cn('h-[42px] rounded-[10px]', errors.exchangeRate && 'border-bad')}
              />
              <p className="text-muted-foreground text-[13px]">
                Los precios se manejan en dólares. Con una tasa cargada, el bot dice el monto en bolívares calculado
                por el sistema — nunca lo estima él. Déjala vacía si no vendes en bolívares.
              </p>
              {settings.exchangeRateUpdatedAt && (
                <p
                  className={cn(
                    'text-[13px]',
                    rateStale ? 'text-bad font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {rateStale
                    ? `Vencida: se cargó el ${formatDateTime(settings.exchangeRateUpdatedAt)}. El bot dejó de cotizar en bolívares hasta que la actualices.`
                    : `Actualizada el ${formatDateTime(settings.exchangeRateUpdatedAt)}. Vence a las ${EXCHANGE_RATE_MAX_AGE_HOURS} horas.`}
                </p>
              )}
              <FieldError messages={errors.exchangeRate} />
            </div>
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={2} title="Ventas" sub="Qué puede hacer el bot por su cuenta" />
          <div className="flex flex-col gap-4 p-5">
            <Toggle
              id="autoCreateClient"
              label="Registrar clientes nuevos"
              hint="Si el contacto no existe en el CRM, el bot puede crearlo con su nombre y teléfono."
              checked={data.autoCreateClient}
              onChange={(v) => setData('autoCreateClient', v)}
            />
            <Toggle
              id="autoCreateSale"
              label="Registrar ventas por aprobar"
              hint="El bot cierra la venta en estado Por aprobar; nadie entrega credenciales hasta que verifiques el pago."
              checked={data.autoCreateSale}
              onChange={(v) => setData('autoCreateSale', v)}
            />
            <Toggle
              id="handoffEnabled"
              label="Permitir escalar a un humano"
              hint="El bot puede ceder la conversación cuando el cliente lo pide o no sabe resolver."
              checked={data.handoffEnabled}
              onChange={(v) => setData('handoffEnabled', v)}
            />
            <NumberField
              id="handoffMinutes"
              name="handoffMinutes"
              label="Minutos de atención humana"
              hint="Pasado este tiempo sin actividad del agente, el bot retoma la conversación."
              value={data.handoffMinutes}
              onChange={(v) => setData('handoffMinutes', v)}
              min={5}
              max={1440}
              error={errors.handoffMinutes}
            />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={3} title="Motor" sub="Ajustes finos del modelo" />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chatModel" className="text-[13px] font-semibold">
                Modelo de chat *
              </Label>
              <Input
                id="chatModel"
                name="chatModel"
                value={data.chatModel}
                onChange={(e) => setData('chatModel', e.target.value)}
                maxLength={60}
                className={cn('h-[42px] rounded-[10px]', errors.chatModel && 'border-bad')}
                required
              />
              <FieldError messages={errors.chatModel} />
            </div>

            <NumberField
              id="temperature"
              name="temperature"
              label="Temperatura"
              hint="0 = siempre la misma respuesta. Para vender, mantenla baja."
              value={data.temperature}
              onChange={(v) => setData('temperature', v)}
              min={0}
              max={2}
              step={0.1}
              error={errors.temperature}
            />
            <NumberField
              id="retrievalTopK"
              name="retrievalTopK"
              label="Fragmentos de conocimiento"
              value={data.retrievalTopK}
              onChange={(v) => setData('retrievalTopK', v)}
              min={1}
              max={20}
              error={errors.retrievalTopK}
            />
            <NumberField
              id="retrievalMinScore"
              name="retrievalMinScore"
              label="Similitud mínima"
              hint="Por debajo de este valor el fragmento se descarta por irrelevante."
              value={data.retrievalMinScore}
              onChange={(v) => setData('retrievalMinScore', v)}
              min={0}
              max={1}
              step={0.05}
              error={errors.retrievalMinScore}
            />
            <NumberField
              id="historyWindow"
              name="historyWindow"
              label="Mensajes de historial"
              value={data.historyWindow}
              onChange={(v) => setData('historyWindow', v)}
              min={2}
              max={100}
              error={errors.historyWindow}
            />
            <NumberField
              id="maxToolIterations"
              name="maxToolIterations"
              label="Máximo de herramientas por turno"
              value={data.maxToolIterations}
              onChange={(v) => setData('maxToolIterations', v)}
              min={1}
              max={12}
              error={errors.maxToolIterations}
            />
            <NumberField
              id="contactDailyMessageLimit"
              name="contactDailyMessageLimit"
              label="Límite diario por contacto"
              hint="Tope de mensajes que el bot responde a un mismo número en 24 horas."
              value={data.contactDailyMessageLimit}
              onChange={(v) => setData('contactDailyMessageLimit', v)}
              min={1}
              max={5000}
              error={errors.contactDailyMessageLimit}
            />
          </div>
        </Card>

        <Button type="submit" disabled={pending} className="h-[42px] rounded-[10px]">
          <Check className="size-4" />
          {pending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </div>
    </form>
  );
}
