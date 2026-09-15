import { AlertTriangle, CreditCard, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { money, percent } from '@/lib/format';
import type { DashboardMetricsDto } from '@/modules/dashboard/serializers/dashboard.serializer';

function trendOf(pct: number | null) {
  if (pct === null) return undefined;
  return { dir: pct >= 0 ? ('up' as const) : ('down' as const), value: percent(pct) };
}

/** The four KPI cards at the top of the dashboard. */
export function DashboardStats({ metrics }: { metrics: DashboardMetricsDto }) {
  return (
    <>
      <StatCard
        icon={Wallet}
        tone="primary"
        label="Ingresos del mes"
        value={money(metrics.incomeMonth)}
        trend={trendOf(metrics.incomeTrendPct)}
        sub="vs. mes anterior"
      />
      <StatCard
        icon={TrendingUp}
        tone="ok"
        label="Ganancia neta"
        value={money(metrics.netProfit)}
        trend={trendOf(metrics.profitTrendPct)}
        sub={`margen ${metrics.profitMarginPct}%`}
      />
      <StatCard
        icon={CreditCard}
        tone="info"
        label="Perfiles activos"
        value={metrics.activeProfiles}
        sub={`${metrics.freeProfiles} libres por vender`}
      />
      <StatCard
        icon={AlertTriangle}
        tone="warn"
        label="Por cobrar"
        value={money(metrics.receivableAmount)}
        sub={`${metrics.receivableClients} clientes con deuda`}
      />
    </>
  );
}
