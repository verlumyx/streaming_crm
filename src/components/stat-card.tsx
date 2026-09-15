import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type StatTone = 'primary' | 'ok' | 'info' | 'warn' | 'default';

const TONES: Record<StatTone, string> = {
  primary: 'bg-primary-soft text-primary',
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  default: 'bg-muted text-muted-foreground',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: { dir: 'up' | 'down'; value: string };
  tone?: StatTone;
}

/** Tarjeta de métrica del dashboard (diseño StreamCRM). */
export function StatCard({ icon: Icon, label, value, sub, trend, tone = 'default' }: StatCardProps) {
  return (
    <Card className="relative gap-1 overflow-hidden rounded-2xl p-5">
      <div
        className="pointer-events-none absolute top-0 right-0 size-[120px]"
        style={{
          background:
            'radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 7%, transparent), transparent 70%)',
        }}
      />
      <div className="mb-2 flex items-center justify-between">
        <span className={`grid size-[42px] place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon className="size-[19px]" />
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-bold ${
              trend.dir === 'up' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'
            }`}
          >
            {trend.dir === 'up' ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="text-[28px] font-extrabold tracking-tight tabular-nums">{value}</div>
      <div className="text-[13.5px] font-semibold">{label}</div>
      {sub && <div className="text-muted-foreground text-[12.5px]">{sub}</div>}
    </Card>
  );
}
