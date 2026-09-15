'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { manualTransactionRoutes } from '@/modules/manual-transaction/routes';
import { useManualTransactionFormContext } from '../contexts/ManualTransactionFormContext';
import { ManualTransactionLineRow } from './ManualTransactionLineRow';

export function ManualTransactionForm() {
  const router = useRouter();
  const { companyId, data, setData, errors, pending, total, addLine, formAction } = useManualTransactionFormContext();

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={data.id} />
      <input type="hidden" name="paymentMethod" value={data.paymentMethod} />
      <input type="hidden" name="currency" value={data.currency} />
      <input type="hidden" name="reference" value={data.reference} />
      <input type="hidden" name="lines" value={JSON.stringify(data.lines)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Fecha *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={data.date}
            onChange={(e) => setData('date', e.target.value)}
            className={cn('h-[42px] rounded-[10px]', errors.date && 'border-bad')}
          />
          {errors.date && <p className="text-bad text-sm">{errors.date[0]}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            name="description"
            value={data.description}
            onChange={(e) => setData('description', e.target.value)}
            className="h-[42px] rounded-[10px]"
            placeholder="Descripción general (opcional)"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Líneas *</Label>
          <Button type="button" variant="outline" size="sm" className="bg-card rounded-[10px] font-semibold" onClick={addLine}>
            <Plus className="mr-1.5 size-4" />
            Agregar línea
          </Button>
        </div>

        {errors.lines && <p className="text-bad text-sm">{errors.lines[0]}</p>}

        <div className="flex flex-col gap-2.5">
          {data.lines.map((_, index) => (
            <ManualTransactionLineRow key={index} index={index} />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-3 text-sm">
          <span className="text-muted-foreground font-semibold">Total</span>
          <span className="text-lg font-bold tabular-nums">
            {total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          value={data.notes}
          onChange={(e) => setData('notes', e.target.value)}
          rows={3}
          className="rounded-[10px]"
          placeholder="Notas internas (opcional)"
        />
      </div>

      <div className="flex justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="bg-card rounded-[10px] font-semibold"
          onClick={() => router.push(manualTransactionRoutes.index(companyId))}
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
