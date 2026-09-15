import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('rounded-2xl p-5', className)}>
      <Skeleton className="h-full w-full" />
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} className="h-[132px]" />
      ))}
    </>
  );
}
