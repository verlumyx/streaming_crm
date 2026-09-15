import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type MiniStatAccent = 'default' | 'bad' | 'ok' | 'warn';

const ACCENTS: Record<MiniStatAccent, string> = {
  default: '',
  bad: 'text-bad',
  ok: 'text-ok',
  warn: 'text-warn',
};

interface MiniStatProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: MiniStatAccent;
  icon?: LucideIcon;
}

/** Métrica compacta para las fichas (show) de clientes, cuentas, ventas, etc. */
export function MiniStat({ label, value, sub, accent = 'default', icon: Icon }: MiniStatProps) {
  return (
    <Card className="gap-1 rounded-2xl px-[18px] py-4">
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className={`text-[21px] font-extrabold tracking-tight tabular-nums ${ACCENTS[accent]}`}>
        {value}
      </span>
      {sub && <span className="text-muted-foreground text-[12.5px]">{sub}</span>}
    </Card>
  );
}
