'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { money } from '@/lib/format';
import type { DashboardRevenuePointDto } from '@/modules/dashboard/serializers/dashboard.serializer';

/**
 * Grouped bars per month: income vs cost for the last 6 months. The scale uses the largest income or cost so
 * months with a loss are obvious. The tooltip highlights the month's net profit.
 */
export function DashboardRevenueChart({ data }: { data: DashboardRevenuePointDto[] }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.income, m.expense]));
  const [highlighted, setHighlighted] = useState(data.length - 1);

  return (
    <Card className="gap-0 rounded-2xl py-0">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div>
          <div className="text-base font-bold tracking-tight">Ingresos vs. costo</div>
          <div className="text-muted-foreground mt-0.5 text-[13px]">Últimos 6 meses · ganancia neta destacada</div>
        </div>
        <div className="text-muted-foreground flex gap-3.5 text-[12.5px] font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <i className="bg-primary size-[9px] rounded-[3px]" />
            Ingreso
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="bg-destructive size-[9px] rounded-[3px]" />
            Costo
          </span>
        </div>
      </div>
      <div className="flex h-[220px] items-end gap-3.5 px-5 pt-6 pb-5">
        {data.map((m, i) => {
          const on = i === highlighted;
          return (
            <div
              key={`${m.month}-${i}`}
              className="relative flex h-full flex-1 flex-col items-center gap-2.5"
              onMouseEnter={() => setHighlighted(i)}
            >
              <div
                className={`bg-foreground text-background pointer-events-none absolute -top-1.5 flex -translate-y-full flex-col items-center rounded-[9px] px-2.5 py-1.5 leading-tight whitespace-nowrap transition-opacity ${
                  on ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="text-[13px] font-bold">{money(m.profit)}</span>
                <small className="text-[9.5px] font-semibold tracking-wider uppercase opacity-70">ganancia neta</small>
                <span className="bg-foreground absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45" />
              </div>
              <div
                className={`flex w-full max-w-16 flex-1 items-end justify-center gap-1.5 transition-opacity ${
                  on ? '' : 'opacity-55'
                }`}
              >
                <div
                  className="bg-primary w-1/2 rounded-t-[6px] rounded-b-[3px]"
                  style={{ height: `${(m.income / max) * 100}%` }}
                  title={`Ingreso ${money(m.income)}`}
                />
                <div
                  className="bg-destructive w-1/2 rounded-t-[6px] rounded-b-[3px]"
                  style={{ height: `${(m.expense / max) * 100}%` }}
                  title={`Costo ${money(m.expense)}`}
                />
              </div>
              <div className={`text-[12.5px] font-semibold ${on ? 'text-foreground' : 'text-muted-foreground'}`}>
                {m.month}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
