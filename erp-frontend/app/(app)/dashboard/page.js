'use client';

import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, ClipboardList, Boxes, ShieldCheck, ReceiptText, Truck, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { dashboardApi } from '@/lib/api/services';
import { useAuth } from '@/lib/auth/auth-context';
import { formatMoney, formatNumber, humanize } from '@/lib/utils';

const WIDGET_ICON = {
  'sales-summary': ShoppingCart,
  'purchase-summary': ClipboardList,
  'inventory-health': Boxes,
  'quality-health': ShieldCheck,
  'finance-outstanding': ReceiptText,
  'shipment-pipeline': Truck
};

function StatusBreakdown({ data }) {
  const rows = data?.byStatus || [];
  if (!rows.length) return <p className="text-sm text-muted-foreground">No records yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((r) => (
        <div key={r.status} className="flex items-center gap-2 rounded-md border border-border bg-slate-50 px-2.5 py-1.5">
          <StatusBadge status={r.status} />
          <span className="text-sm font-semibold tabular-nums">{formatNumber(r.count)}</span>
        </div>
      ))}
    </div>
  );
}

function WidgetCard({ widget }) {
  const Icon = WIDGET_ICON[widget.key] || TrendingUp;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {widget.available === false ? (
          <p className="text-sm text-muted-foreground">Temporarily unavailable — this service is offline.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {'totalValue' in widget && <Metric label="Value" value={formatMoney(widget.totalValue)} />}
              {'totalOrders' in widget && <Metric label="Orders" value={formatNumber(widget.totalOrders)} />}
              {'totalOutstanding' in widget && <Metric label="Outstanding" value={formatMoney(widget.totalOutstanding)} />}
              {'receivableOutstanding' in widget && <Metric label="Receivable" value={formatMoney(widget.receivableOutstanding)} />}
              {'payableOutstanding' in widget && <Metric label="Payable" value={formatMoney(widget.payableOutstanding)} />}
              {'totalValue' in widget && widget.key === 'inventory-health' && <Metric label="Low stock" value={formatNumber(widget.lowStockCount)} />}
              {'rejectionRatePct' in widget && <Metric label="Rejection rate" value={`${widget.rejectionRatePct ?? 0}%`} />}
              {'total' in widget && widget.key === 'shipment-pipeline' && <Metric label="Shipments" value={formatNumber(widget.total)} />}
            </div>
            <StatusBreakdown data={widget} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-slate-50/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary()
  });

  console.log(user)

  const widgets = data?.widgets || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        description="A live snapshot of the trading floor, tuned to your role."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <Card><CardContent className="p-0"><EmptyState title="Couldn't load the dashboard" description="The dashboard service may be starting up. Try again shortly." /></CardContent></Card>
      ) : widgets.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState title="No widgets for your role" description="Ask an administrator to assign dashboard widgets." /></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {widgets.map((w) => <WidgetCard key={w.key} widget={w} />)}
        </div>
      )}
    </div>
  );
}
