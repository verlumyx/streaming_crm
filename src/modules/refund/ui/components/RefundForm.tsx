'use client';

import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useRefundFormContext } from '../contexts/RefundFormContext';

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-bad text-sm">{messages[0]}</p>;
}

/** Shared by Crear (sale select) and the inline Editar of the detail page (sale shown read-only). */
export function RefundForm({ onCancel }: { onCancel: () => void }) {
  const { mode, refund, sales, data, setData, selectSale, formAction, pending, errors } = useRefundFormContext();

  const saleOptions = sales.map((sale) => ({
    value: sale.id,
    label: `${sale.code} · ${sale.clientName ?? '—'} · ${money(sale.price)}`,
  }));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === 'create' && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="amount" value={data.amount || ''} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="saleId">Venta *</Label>
        {mode === 'create' ? (
          <SearchableSelect
            id="saleId"
            name="saleId"
            options={saleOptions}
            value={data.saleId}
            onChange={selectSale}
            placeholder="Selecciona una venta"
            searchPlaceholder="Buscar por código o cliente..."
            emptyText="No hay ventas que admitan reembolso"
            aria-invalid={Boolean(errors.saleId)}
            className={cn('h-[42px] rounded-[10px]', errors.saleId && 'border-bad')}
          />
        ) : (
          <div className="bg-muted rounded-[10px] border px-3 py-2.5 text-sm font-semibold">
            {refund?.sale?.code ?? '—'} · {refund?.client?.name ?? '—'}
          </div>
        )}
        <FieldError messages={errors.saleId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Monto *</Label>
        <CurrencyInput
          id="amount"
          min={0}
          decimals={2}
          value={data.amount}
          onValueChange={(value) => setData('amount', value)}
          className={cn('h-[42px] rounded-[10px]', errors.amount && 'border-bad')}
        />
        <FieldError messages={errors.amount} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Razón</Label>
        <Textarea
          id="reason"
          name="reason"
          value={data.reason}
          onChange={(e) => setData('reason', e.target.value)}
          rows={3}
          maxLength={255}
          className={cn('rounded-[10px]', errors.reason && 'border-bad')}
          placeholder="Motivo del reembolso"
        />
        <FieldError messages={errors.reason} />
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
