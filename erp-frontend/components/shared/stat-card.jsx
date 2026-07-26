import { cn, formatNumber } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/*
  Compact KPI tile for the top of module pages. Deliberately quiet: value leads,
  a small label and optional delta sit beneath. `tone` accents the left edge.
*/
const TONES = {
  primary: 'before:bg-primary',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  info: 'before:bg-info',
  destructive: 'before:bg-destructive',
  neutral: 'before:bg-slate-300'
};

export function StatCard({ label, value, hint, tone = 'primary', loading, icon: Icon }) {
  return (
    <Card className={cn('relative overflow-hidden pl-4 before:absolute before:left-0 before:top-0 before:h-full before:w-1', TONES[tone])}>
      <div className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {typeof value === 'number' ? formatNumber(value) : value ?? '—'}
            </p>
          )}
          {hint && !loading && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-md bg-slate-50 p-2 text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
}
