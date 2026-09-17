'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { FormSectionHead } from '@/components/form-section-head';
import { cn } from '@/lib/utils';
import { botRoutes } from '@/modules/bot/routes';
import { useBotChannelFormContext } from '../contexts/BotChannelFormContext';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

function SecretField({
  id,
  label,
  hint,
  stored,
  value,
  onChange,
  error,
  required,
}: {
  id: string;
  label: string;
  hint: string;
  stored: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold">
        {label}
        {required && ' *'}
      </Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={stored ? 'Guardado — escribe solo si quieres cambiarlo' : ''}
        className={cn('h-[42px] rounded-[10px] font-mono', error && 'border-bad')}
        required={required && !stored}
      />
      <p className="text-muted-foreground text-[13px]">{hint}</p>
      <FieldError messages={error} />
    </div>
  );
}

export function BotChannelForm({ companyId, webhookUrl }: { companyId: string; webhookUrl: string | null }) {
  const router = useRouter();
  const { mode, data, setData, formAction, pending, errors, channel } = useBotChannelFormContext();
  const isWhatsApp = data.provider === 'whatsapp';

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === 'create' && (
        <>
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="provider" value={data.provider} />
        </>
      )}
      <input type="hidden" name="status" value={data.active ? 'active' : 'inactive'} />

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <FormSectionHead step={1} title="Canal" sub="Por dónde te escriben los clientes" />
        <div className="flex flex-col gap-4 p-5">
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provider" className="text-[13px] font-semibold">
                Plataforma *
              </Label>
              <SearchableSelect
                id="provider"
                options={[
                  { value: 'whatsapp', label: 'WhatsApp (API oficial de Meta)' },
                  { value: 'telegram', label: 'Telegram' },
                ]}
                value={data.provider}
                onChange={(value) => value && setData('provider', value as typeof data.provider)}
                placeholder="Plataforma"
                emptyText="Sin resultados"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName" className="text-[13px] font-semibold">
              Nombre *
            </Label>
            <Input
              id="displayName"
              name="displayName"
              value={data.displayName}
              onChange={(e) => setData('displayName', e.target.value)}
              placeholder={isWhatsApp ? 'Ej. Ventas +58 412 1234567' : 'Ej. @mi_bot_de_ventas'}
              maxLength={100}
              className={cn('h-[42px] rounded-[10px]', errors.displayName && 'border-bad')}
              required
            />
            <p className="text-muted-foreground text-[13px]">
              {isWhatsApp
                ? 'Es el nombre que el asistente usa para presentarse como la empresa.'
                : 'Si lo dejas vacío se usará el @usuario del bot.'}
            </p>
            <FieldError messages={errors.displayName} />
          </div>

          {isWhatsApp && mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="externalId" className="text-[13px] font-semibold">
                Phone Number ID *
              </Label>
              <Input
                id="externalId"
                name="externalId"
                value={data.externalId}
                onChange={(e) => setData('externalId', e.target.value)}
                placeholder="106540352242922"
                maxLength={64}
                className={cn('h-[42px] rounded-[10px] font-mono', errors.externalId && 'border-bad')}
                required
              />
              <p className="text-muted-foreground text-[13px]">
                En Meta for Developers → WhatsApp → Configuración de la API.
              </p>
              <FieldError messages={errors.externalId} />
            </div>
          )}

          <div className="flex items-start justify-between gap-4 rounded-[10px] border p-4">
            <div className="min-w-0">
              <Label htmlFor="active" className="text-[13px] font-semibold">
                Canal activo
              </Label>
              <p className="text-muted-foreground mt-0.5 text-[13px]">
                Mientras esté inactivo, el webhook rechaza los mensajes entrantes de este número.
              </p>
            </div>
            <Switch
              id="active"
              checked={data.active}
              onCheckedChange={(value) => setData('active', value)}
              className="mt-0.5 shrink-0"
            />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <FormSectionHead step={2} title="Credenciales" sub="Se guardan cifradas y nunca se vuelven a mostrar" />
        <div className="flex flex-col gap-4 p-5">
          <SecretField
            id="accessToken"
            label={isWhatsApp ? 'Access Token' : 'Token del bot'}
            hint={
              isWhatsApp
                ? 'Token permanente del usuario de sistema de la app de Meta.'
                : 'El token que te dio @BotFather.'
            }
            stored={Boolean(channel?.hasAccessToken)}
            value={data.accessToken}
            onChange={(value) => setData('accessToken', value)}
            error={errors.accessToken}
            required={mode === 'create'}
          />

          {isWhatsApp && (
            <>
              <SecretField
                id="appSecret"
                label="App Secret"
                hint="Verifica la firma X-Hub-Signature-256 de cada mensaje. Sin él no se acepta ninguno."
                stored={Boolean(channel?.hasAppSecret)}
                value={data.appSecret}
                onChange={(value) => setData('appSecret', value)}
                error={errors.appSecret}
                required={mode === 'create'}
              />
              <SecretField
                id="verifyToken"
                label="Verify Token"
                hint="El que escribirás en Meta al registrar el webhook. Puede ser cualquier cadena larga."
                stored={Boolean(channel?.hasVerifyToken)}
                value={data.verifyToken}
                onChange={(value) => setData('verifyToken', value)}
                error={errors.verifyToken}
                required={mode === 'create'}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wabaId" className="text-[13px] font-semibold">
                    WABA ID
                  </Label>
                  <Input
                    id="wabaId"
                    name="wabaId"
                    value={data.wabaId}
                    onChange={(e) => setData('wabaId', e.target.value)}
                    maxLength={64}
                    className="h-[42px] rounded-[10px] font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="graphApiVersion" className="text-[13px] font-semibold">
                    Versión de la Graph API *
                  </Label>
                  <Input
                    id="graphApiVersion"
                    name="graphApiVersion"
                    value={data.graphApiVersion}
                    onChange={(e) => setData('graphApiVersion', e.target.value)}
                    maxLength={10}
                    className="h-[42px] rounded-[10px] font-mono"
                    required
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {webhookUrl && (
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={3} title="Webhook" sub="Dónde recibe los mensajes este canal" />
          <div className="flex flex-col gap-3 p-5">
            <code className="bg-muted overflow-x-auto rounded-[10px] p-3 text-[13px]">{webhookUrl}</code>
            {isWhatsApp ? (
              <p className="text-muted-foreground text-[13px]">
                Pégala en Meta for Developers → Webhooks, con tu Verify Token, y suscribe el campo{' '}
                <strong>messages</strong>. Recuerda además llamar a{' '}
                <code className="text-[12px]">POST /{'{WABA_ID}'}/subscribed_apps</code>: sin ese paso Meta acepta la
                suscripción pero no entrega nada.
              </p>
            ) : (
              <p className="text-muted-foreground text-[13px]">
                Se registra automáticamente al guardar. Si cambias la URL pública de la app, vuelve a registrarlo.
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="h-[42px] rounded-[10px]"
          onClick={() => router.push(botRoutes.channels(companyId))}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="h-[42px] rounded-[10px]">
          <Check className="size-4" />
          {pending ? 'Guardando…' : mode === 'create' ? 'Conectar canal' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
