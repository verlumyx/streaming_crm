'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { useManualTransactionFormContext } from '../contexts/ManualTransactionFormContext';

export function ManualTransactionLineRow({ index }: { index: number }) {
  const { data, errors, catalog, updateLine, removeLine } = useManualTransactionFormContext();

  const line = data.lines[index];
  const categoryError = errors[`lines.${index}.category`]?.[0];
  const amountError = errors[`lines.${index}.amount`]?.[0];

  return (
    <div className="bg-card grid grid-cols-1 gap-3 rounded-[10px] border p-3 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto] sm:items-start">
      <div className="flex flex-col gap-1.5">
        <SearchableSelect
          aria-label="Categoría"
          options={[
            ...catalog.income.map((option) => ({ ...option, group: 'Ingresos' })),
            ...catalog.expense.map((option) => ({ ...option, group: 'Egresos' })),
          ]}
          value={line.category || null}
          onChange={(value) => value && updateLine(index, { category: value })}
          placeholder="Categoría"
          searchPlaceholder="Buscar categoría..."
          emptyText="Sin resultados"
          aria-invalid={Boolean(categoryError)}
          className={cn('h-[42px] rounded-[10px]', categoryError && 'border-bad')}
        />
        {categoryError && <p className="text-bad text-sm">{categoryError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <CurrencyInput
          min={0}
          decimals={2}
          value={line.amount}
          onValueChange={(value) => updateLine(index, { amount: value })}
          className={cn('h-[42px] rounded-[10px]', amountError && 'border-bad')}
        />
        {amountError && <p className="text-bad text-sm">{amountError}</p>}
      </div>

      <Input
        value={line.description}
        onChange={(e) => updateLine(index, { description: e.target.value })}
        placeholder="Descripción (opcional)"
        className="h-[42px] rounded-[10px]"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="bg-card h-[42px] w-[42px] rounded-[10px]"
        onClick={() => removeLine(index)}
        disabled={data.lines.length <= 1}
        aria-label="Quitar línea"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
