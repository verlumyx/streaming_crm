'use client';

import { Check, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clp } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SALE_CAPACITY_LABELS } from '@/modules/sale/ui/sale-labels';
import { useSaleFormContext } from '../contexts/SaleFormContext';

/** Step 2: start date and plan. The plan fixes the service and the snapshot (capacity, duration, price). */
export function SalePlanStep() {
  const { plans, data, setData, selectPlan, errors } = useSaleFormContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="start-date">Fecha de inicio *</Label>
        <Input
          id="start-date"
          type="date"
          value={data.startDate}
          onChange={(e) => setData('startDate', e.target.value)}
          className={cn('h-[42px] max-w-xs rounded-[10px]', errors.startDate && 'border-bad')}
        />
        {errors.startDate && <p className="text-bad text-sm">{errors.startDate[0]}</p>}
      </div>

      {errors.planId && <p className="text-bad text-sm">{errors.planId[0]}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const selected = data.planId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(plan.id)}
              className={cn(
                'flex flex-col gap-2 rounded-[12px] border p-4 text-left transition-colors',
                selected ? 'border-primary bg-primary/5' : 'hover:bg-muted',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold">
                  <Package className="text-muted-foreground size-4" />
                  {plan.name}
                </span>
                {selected && <Check className="text-primary size-5" />}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
                <span>{plan.serviceName}</span>
                <span>· {SALE_CAPACITY_LABELS[plan.capacity]}</span>
                <span>· {plan.durationDays} días</span>
              </div>
              <span className="text-lg font-extrabold tabular-nums">{clp(plan.salePrice)}</span>
            </button>
          );
        })}
        {plans.length === 0 && <p className="text-muted-foreground p-6 text-center text-sm">No hay planes activos.</p>}
      </div>
    </div>
  );
}
