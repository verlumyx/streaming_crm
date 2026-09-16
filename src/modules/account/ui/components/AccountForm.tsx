'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { FormSectionHead } from '@/components/form-section-head';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ACCOUNT_STATUSES, PROFILE_STATUSES, type AccountStatus, type ProfileStatus } from '@/modules/account/models/account.model';
import { ACCOUNT_STATUS_LABELS, PROFILE_STATUS_LABELS } from '../account-labels';
import { useAccountFormContext } from '../contexts/AccountFormContext';

function FieldError({ messages, className }: { messages?: string[]; className?: string }) {
  if (!messages?.length) return null;
  return <p className={cn('text-bad text-sm', className)}>{messages[0]}</p>;
}

const FIELD = 'h-[42px] rounded-[10px]';
const LABEL = 'text-[13px] font-semibold';

export function AccountForm() {
  const router = useRouter();
  const {
    mode,
    data,
    setData,
    setProfile,
    changeService,
    profilesPayload,
    services,
    selectedService,
    formAction,
    pending,
    errors,
  } = useAccountFormContext();
  const isEdit = mode === 'edit';
  const profileColumns = isEdit ? 'lg:grid-cols-[60px_1fr_1fr_2fr]' : 'lg:grid-cols-[60px_1fr]';

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
      {!isEdit && <input type="hidden" name="id" value={data.id} />}
      {!isEdit && <input type="hidden" name="serviceId" value={data.serviceId} />}
      <input type="hidden" name="cost" value={String(data.cost)} />
      <input type="hidden" name="status" value={data.status} />
      <input type="hidden" name="profiles" value={profilesPayload} />

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead step={1} title="Datos de la cuenta" sub="Cabecera de la cuenta del servicio de streaming" />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceId" className={LABEL}>
                Servicio *
              </Label>
              <SearchableSelect
                id="serviceId"
                options={services.map((s) => ({ value: s.id, label: `${s.name} (${s.code}) · ${s.maxProfiles} perfiles` }))}
                value={data.serviceId || null}
                onChange={(value) => value && changeService(value)}
                disabled={isEdit || services.length === 0}
                placeholder={services.length === 0 ? 'Sin servicios activos' : 'Selecciona un servicio'}
                searchPlaceholder="Buscar servicio..."
                emptyText="No hay servicios activos"
                aria-invalid={Boolean(errors.serviceId)}
                className={cn(FIELD, errors.serviceId && 'border-bad')}
              />
              {isEdit && <p className="text-muted-foreground text-xs">El servicio no puede cambiarse en una cuenta existente.</p>}
              <FieldError messages={errors.serviceId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className={LABEL}>
                Email de la cuenta *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                placeholder="cuenta@servicio.com"
                className={cn(FIELD, errors.email && 'border-bad')}
                maxLength={255}
                required
              />
              <FieldError messages={errors.email} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className={LABEL}>
                Contraseña {isEdit ? '' : '*'}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                placeholder={isEdit ? 'Dejar en blanco para mantener' : 'Contraseña de la cuenta'}
                className={cn(FIELD, errors.password && 'border-bad')}
                maxLength={255}
                autoComplete="new-password"
                required={!isEdit}
              />
              <FieldError messages={errors.password} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cost" className={LABEL}>
                Costo *
              </Label>
              <CurrencyInput
                id="cost"
                min={0}
                decimals={2}
                value={data.cost}
                onValueChange={(value) => setData('cost', value)}
                className={cn(FIELD, errors.cost && 'border-bad')}
                required
              />
              <FieldError messages={errors.cost} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchaseDate" className={LABEL}>
                Fecha de compra *
              </Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={data.purchaseDate}
                onChange={(e) => setData('purchaseDate', e.target.value)}
                className={cn(FIELD, errors.purchaseDate && 'border-bad')}
                required
              />
              <FieldError messages={errors.purchaseDate} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextRenewal" className={LABEL}>
                Próxima renovación *
              </Label>
              <Input
                id="nextRenewal"
                name="nextRenewal"
                type="date"
                value={data.nextRenewal}
                onChange={(e) => setData('nextRenewal', e.target.value)}
                className={cn(FIELD, errors.nextRenewal && 'border-bad')}
                required
              />
              <FieldError messages={errors.nextRenewal} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status" className={LABEL}>
                Estado *
              </Label>
              <SearchableSelect
                id="status"
                options={ACCOUNT_STATUSES.map((status) => ({ value: status, label: ACCOUNT_STATUS_LABELS[status] }))}
                value={data.status}
                onChange={(value) => value && setData('status', value as AccountStatus)}
                placeholder="Estado"
                emptyText="Sin resultados"
                aria-invalid={Boolean(errors.status)}
                className={cn(FIELD, errors.status && 'border-bad')}
              />
              <FieldError messages={errors.status} />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="notes" className={LABEL}>
                Notas
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={data.notes}
                onChange={(e) => setData('notes', e.target.value)}
                placeholder="Notas internas (opcional)"
                className="min-h-[72px] rounded-[10px]"
              />
              <FieldError messages={errors.notes} />
            </div>
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-2xl py-0">
          <FormSectionHead
            step={2}
            title="Perfiles"
            sub={
              isEdit
                ? 'Actualiza PIN, estado y notas de cada perfil'
                : 'Se generan automáticamente según el servicio; puedes precargar los PIN'
            }
          />
          <FieldError messages={errors.profiles} className="px-5 pt-4" />
          {data.profiles.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-sm">
              {services.length === 0
                ? 'Primero crea un servicio activo.'
                : 'Selecciona un servicio para generar sus perfiles.'}
            </div>
          ) : (
            <div className="flex flex-col">
              <div
                className={cn(
                  'bg-muted text-muted-foreground hidden h-11 items-center gap-3 border-b px-5 text-[11.5px] font-bold tracking-wider uppercase lg:grid',
                  profileColumns,
                )}
              >
                <div>#</div>
                <div>PIN</div>
                {isEdit && <div>Estado</div>}
                {isEdit && <div>Notas</div>}
              </div>
              {data.profiles.map((row, index) => (
                <div
                  key={row.number}
                  className={cn('grid grid-cols-1 items-center gap-3 border-b px-5 py-3 last:border-b-0', profileColumns)}
                >
                  <div className="text-muted-foreground font-bold tabular-nums">#{row.number}</div>
                  <div>
                    <Input
                      aria-label={`PIN del perfil ${row.number}`}
                      value={row.pin}
                      onChange={(e) => setProfile(index, 'pin', e.target.value)}
                      placeholder="PIN"
                      maxLength={10}
                      className={cn('h-[38px] rounded-[10px]', errors[`profiles.${index}.pin`] && 'border-bad')}
                    />
                    <FieldError messages={errors[`profiles.${index}.number`]} className="mt-1 text-xs" />
                    <FieldError messages={errors[`profiles.${index}.pin`]} className="mt-1 text-xs" />
                  </div>
                  {isEdit && (
                    <div>
                      <SearchableSelect
                        aria-label={`Estado del perfil ${row.number}`}
                        options={PROFILE_STATUSES.map((status) => ({ value: status, label: PROFILE_STATUS_LABELS[status] }))}
                        value={row.status}
                        onChange={(value) => value && setProfile(index, 'status', value as ProfileStatus)}
                        emptyText="Sin resultados"
                        className="h-[38px] rounded-[10px]"
                      />
                      <FieldError messages={errors[`profiles.${index}.status`]} className="mt-1 text-xs" />
                    </div>
                  )}
                  {isEdit && (
                    <div>
                      <Input
                        aria-label={`Notas del perfil ${row.number}`}
                        value={row.notes}
                        onChange={(e) => setProfile(index, 'notes', e.target.value)}
                        placeholder="Notas del perfil"
                        className="h-[38px] rounded-[10px]"
                      />
                      <FieldError messages={errors[`profiles.${index}.notes`]} className="mt-1 text-xs" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="gap-3.5 rounded-2xl p-5 xl:sticky xl:top-[86px]">
        <div className="text-base font-bold tracking-tight">Resumen</div>
        <div className="flex flex-col gap-2.5">
          <SummaryRow label="Servicio">{selectedService?.name ?? '—'}</SummaryRow>
          <SummaryRow label="Email">
            <span className="block max-w-[160px] truncate">{data.email || '—'}</span>
          </SummaryRow>
          <SummaryRow label="Estado">{ACCOUNT_STATUS_LABELS[data.status]}</SummaryRow>
          <SummaryRow label="Perfiles">{data.profiles.length}</SummaryRow>
          <div className="border-input flex items-center justify-between border-t border-dashed pt-2.5 text-[15px]">
            <span className="text-muted-foreground font-medium">Costo</span>
            <b className="font-bold tabular-nums">{money(data.cost)}</b>
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending || services.length === 0}
          className="h-10 w-full justify-center rounded-[11px] font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
        >
          <Check />
          {pending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
        {services.length === 0 && (
          <p className="text-muted-foreground text-xs">Primero crea un servicio activo para registrar cuentas.</p>
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
