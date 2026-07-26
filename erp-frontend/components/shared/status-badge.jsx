import { cn, humanize } from '@/lib/utils';
import { statusVariant } from '@/lib/constants/status';

/*
  Semantic status chip. One source of truth (lib/constants/status.js) maps every
  backend status string to a variant, so the same status is always the same
  colour across all 20 modules.
*/
const STYLES = {
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  info: 'bg-info-soft text-info border-info/20',
  destructive: 'bg-red-50 text-destructive border-destructive/20',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  draft: 'bg-slate-50 text-slate-500 border-slate-200 border-dashed'
};

export function StatusBadge({ status, className }) {
  const variant = statusVariant(status);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', STYLES[variant], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-success': variant === 'success',
        'bg-warning': variant === 'warning',
        'bg-info': variant === 'info',
        'bg-destructive': variant === 'destructive',
        'bg-slate-400': variant === 'neutral' || variant === 'draft'
      })} />
      {humanize(status)}
    </span>
  );
}
