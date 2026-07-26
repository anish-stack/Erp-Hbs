'use client';

import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/*
  One consistent error screen used by every Next error boundary (app/error.js,
  (app)/error.js, global-error.js) and the manual <ErrorBoundary>. It names the
  place that failed so you can tell at a glance WHICH component/segment broke,
  shows the message + digest, and in development shows the full stack.
*/
export function ErrorState({
  title = 'Something went wrong',
  where,          // e.g. "Sales orders page" or a component name — the "kis component" hint
  error,          // Error object
  reset,          // retry fn (from Next error boundaries)
  showHome = true
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  const message = error?.message || 'An unexpected error occurred.';
  const digest = error?.digest;

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-5 rounded-lg border border-destructive/20 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-red-50 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {where && (
              <p className="text-sm text-muted-foreground">
                Failed in: <span className="font-medium text-slate-700">{where}</span>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-800">{message}</p>
          {digest && <p className="mt-1 text-xs text-muted-foreground">Reference: {digest}</p>}
        </div>

        {isDev && error?.stack && (
          <details className="rounded-md border border-border bg-slate-900 p-3 text-slate-100">
            <summary className="cursor-pointer text-xs font-medium text-slate-300">
              Stack trace (development only)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap gap-2">
          {reset && (
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          )}
          {showHome && (
            <Button variant="outline" asChild>
              <Link href="/dashboard"><Home className="h-4 w-4" /> Back to dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
