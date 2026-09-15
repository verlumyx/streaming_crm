import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  icon: LucideIcon;
  title: string;
  value: string | number;
  sub?: string;
  iconClassName?: string;
  valueClassName?: string;
};

export function ReportSummaryCard({ icon: Icon, title, value, sub, iconClassName, valueClassName }: Props) {
  return (
    <Card className="gap-2 p-5">
      <div className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn('size-4', iconClassName)} />
        {title}
      </div>
      <div className={cn('truncate text-2xl font-extrabold tabular-nums', valueClassName)}>{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </Card>
  );
}
