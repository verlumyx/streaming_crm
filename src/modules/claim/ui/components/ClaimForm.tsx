'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CLAIM_CHANNELS, type ClaimChannel } from '@/modules/claim/models/claim.model';
import { CLAIM_DESCRIPTION_MAX } from '@/modules/claim/validation/claim-fields';
import { useClaimFormContext } from '../contexts/ClaimFormContext';
import { CLAIM_CHANNEL_LABELS } from '../labels';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

/** Compartido por Crear y Editar. */
export function ClaimForm({ onCancel }: { onCancel: () => void }) {
  const { mode, clients, data, setData, formAction, pending, errors } = useClaimFormContext();

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.code} · ${client.name}${client.isActive ? '' : ' (inactivo)'}`,
  }));

  const channelOptions = CLAIM_CHANNELS.map((channel) => ({ value: channel, label: CLAIM_CHANNEL_LABELS[channel] }));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientId">Cliente *</Label>
        <SearchableSelect
          id="clientId"
          name="clientId"
          options={clientOptions}
          value={data.clientId}
          onChange={(value) => setData('clientId', value ?? '')}
          placeholder="Selecciona un cliente"
          searchPlaceholder="Buscar por código o nombre..."
          emptyText="No hay clientes registrados"
          aria-invalid={Boolean(errors.clientId)}
          className={cn('h-[42px] rounded-[10px]', errors.clientId && 'border-bad')}
        />
        <FieldError messages={errors.clientId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Asunto *</Label>
        <Input
          id="subject"
          name="subject"
          value={data.subject}
          onChange={(e) => setData('subject', e.target.value)}
          maxLength={150}
          placeholder="Resumen del reclamo"
          className={cn('h-[42px] rounded-[10px]', errors.subject && 'border-bad')}
        />
        <FieldError messages={errors.subject} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="channel">Canal *</Label>
        <SearchableSelect
          id="channel"
          name="channel"
          options={channelOptions}
          value={data.channel}
          onChange={(value) => setData('channel', (value ?? 'other') as ClaimChannel)}
          placeholder="Selecciona un canal"
          emptyText="Sin canales"
          aria-invalid={Boolean(errors.channel)}
          className={cn('h-[42px] rounded-[10px]', errors.channel && 'border-bad')}
        />
        <FieldError messages={errors.channel} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          name="description"
          value={data.description}
          onChange={(e) => setData('description', e.target.value)}
          rows={5}
          maxLength={CLAIM_DESCRIPTION_MAX}
          placeholder="Detalle de lo que reclama el cliente"
          className={cn('rounded-[10px]', errors.description && 'border-bad')}
        />
        <FieldError messages={errors.description} />
      </div>

      <div className="flex justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="bg-card rounded-[10px] font-semibold"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" className="rounded-[10px] font-semibold" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
