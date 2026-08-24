"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  ClipboardList,
  Boxes,
  ShieldCheck,
  ReceiptText,
  Truck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PackageCheck,
  CircleDollarSign,
  Activity,
  WalletCards,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  BarChart3,
  RefreshCw,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

import { dashboardApi } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { formatMoney, formatNumber, humanize } from "@/lib/utils";

const WIDGET_ICON = {
  "sales-summary": ShoppingCart,
  "purchase-summary": ClipboardList,
  "inventory-health": Boxes,
  "quality-health": ShieldCheck,
  "finance-outstanding": ReceiptText,
  "shipment-pipeline": Truck,
};

const WIDGET_ACCENT = {
  "sales-summary": {
    icon: "bg-indigo-50 text-indigo-600",
    bar: "bg-indigo-600",
  },
  "purchase-summary": {
    icon: "bg-blue-50 text-blue-600",
    bar: "bg-blue-600",
  },
  "inventory-health": {
    icon: "bg-violet-50 text-violet-600",
    bar: "bg-violet-600",
  },
  "quality-health": {
    icon: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-600",
  },
  "finance-outstanding": {
    icon: "bg-amber-50 text-amber-600",
    bar: "bg-amber-500",
  },
  "shipment-pipeline": {
    icon: "bg-cyan-50 text-cyan-600",
    bar: "bg-cyan-600",
  },
};

function getWidget(widgets, key) {
  return widgets.find((w) => w.key === key);
}

function getStatusCount(widget, status) {
  return widget?.byStatus?.find((item) => item.status === status)?.count || 0;
}

function getStatusValue(widget, status) {
  return widget?.byStatus?.find((item) => item.status === status)?.value || 0;
}

function formatDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  trend,
  trendType = "neutral",
}) {
  return (
    <Card className="group relative overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 transition group-hover:opacity-100" />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </p>

            {subtitle && (
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-1.5">
            {trendType === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
            ) : trendType === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
            ) : null}

            <span
              className={`text-xs font-semibold ${trendType === "up"
                  ? "text-emerald-600"
                  : trendType === "down"
                    ? "text-rose-600"
                    : "text-slate-500"
                }`}
            >
              {trend}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* =========================================================
   STATUS BREAKDOWN
========================================================= */

function StatusBreakdown({ data }) {
  const rows = data?.byStatus || [];

  if (!rows.length) {
    return <p className="text-sm text-slate-400">No status records yet.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.status}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <StatusBadge status={row.status} />

            {row.value && (
              <span className="text-xs text-slate-400">
                {formatMoney(row.value)}
              </span>
            )}
          </div>

          <span className="text-sm font-bold tabular-nums text-slate-700">
            {formatNumber(row.count)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>

          {description && (
            <p className="text-xs text-slate-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SALES / PURCHASE CARD
========================================================= */

function TradingOverview({ sales, purchases }) {
  const salesValue = Number(sales?.totalValue || 0);
  const purchaseValue = Number(purchases?.totalValue || 0);

  const max = Math.max(salesValue, purchaseValue, 1);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Trading Overview
            </CardTitle>

            <p className="mt-1 text-xs text-slate-400">
              Sales and purchase activity
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Sales */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                  <ShoppingCart className="h-4 w-4 text-indigo-600" />
                </div>

                <span className="text-sm font-semibold text-slate-700">
                  Sales
                </span>
              </div>

              <span className="text-xs font-medium text-indigo-600">
                {formatNumber(sales?.totalOrders || 0)} orders
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {formatMoney(salesValue)}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${(salesValue / max) * 100}%`,
                }}
              />
            </div>

            <div className="mt-3">
              <StatusBreakdown data={sales} />
            </div>
          </div>

          {/* Purchases */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                </div>

                <span className="text-sm font-semibold text-slate-700">
                  Purchases
                </span>
              </div>

              <span className="text-xs font-medium text-blue-600">
                {formatNumber(purchases?.totalOrders || 0)} orders
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {formatMoney(purchaseValue)}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${(purchaseValue / max) * 100}%`,
                }}
              />
            </div>

            <div className="mt-3">
              <StatusBreakdown data={purchases} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   INVENTORY CARD
========================================================= */

function InventoryCard({ inventory }) {
  const total = Number(inventory?.totalOnHand || 0);
  const lowStock = Number(inventory?.lowStockCount || 0);
  const positions = Number(inventory?.stockPositions || 0);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Inventory Health
            </CardTitle>

            <p className="mt-1 text-xs text-slate-400">
              Current warehouse position
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Boxes className="h-4 w-4 text-violet-600" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-5">
          {/* Circular visual */}
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-violet-50">
            <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white shadow-sm">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">
                  {formatNumber(total)}
                </p>

                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  On hand
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Stock positions</span>

              <span className="text-sm font-bold text-slate-900">
                {formatNumber(positions)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Inventory value</span>

              <span className="text-sm font-bold text-slate-900">
                {formatMoney(inventory?.totalValue || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Low stock
              </span>

              <span
                className={`text-sm font-bold ${lowStock > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
              >
                {formatNumber(lowStock)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   FINANCE CARD
========================================================= */

function FinanceCard({ finance }) {
  const receivable = Number(finance?.receivableOutstanding || 0);
  const payable = Number(finance?.payableOutstanding || 0);
  const total = receivable + payable || 1;

  const receivablePct = (receivable / total) * 100;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Finance Outstanding
            </CardTitle>

            <p className="mt-1 text-xs text-slate-400">
              Receivables and payables
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <CircleDollarSign className="h-4 w-4 text-amber-600" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total outstanding
          </p>

          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {formatMoney(finance?.totalOutstanding || 0)}
          </p>
        </div>

        {/* Split bar */}
        <div className="mb-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-emerald-500 transition-all"
              style={{
                width: `${receivablePct}%`,
              }}
            />

            <div className="flex-1 bg-rose-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-emerald-600" />

              <span className="text-xs font-semibold text-emerald-700">
                Receivable
              </span>
            </div>

            <p className="mt-2 text-lg font-bold text-slate-900">
              {formatMoney(receivable)}
            </p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-rose-600" />

              <span className="text-xs font-semibold text-rose-700">
                Payable
              </span>
            </div>

            <p className="mt-2 text-lg font-bold text-slate-900">
              {formatMoney(payable)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   QUALITY CARD
========================================================= */

function QualityCard({ quality }) {
  const received = Number(quality?.quantities?.received || 0);
  const accepted = Number(quality?.quantities?.accepted || 0);
  const rejected = Number(quality?.quantities?.rejected || 0);

  const acceptanceRate =
    received > 0 ? Math.round((accepted / received) * 100) : 0;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Quality Health
            </CardTitle>

            <p className="mt-1 text-xs text-slate-400">
              Incoming quality performance
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Acceptance rate
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {acceptanceRate}%
            </p>
          </div>

          <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <QualityMetric label="Received" value={received} />

          <QualityMetric label="Accepted" value={accepted} />

          <QualityMetric
            label="Rejected"
            value={rejected}
            danger={rejected > 0}
          />
        </div>

        <div className="mt-5">
          <StatusBreakdown data={quality} />
        </div>
      </CardContent>
    </Card>
  );
}

function QualityMetric({ label, value, danger }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${danger ? "text-rose-600" : "text-slate-900"
          }`}
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}

/* =========================================================
   SHIPMENT CARD
========================================================= */

function ShipmentCard({ shipment }) {
  const total = Number(shipment?.total || 0);
  const pending = getStatusCount(shipment, "PENDING");

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Shipment Pipeline
            </CardTitle>

            <p className="mt-1 text-xs text-slate-400">
              Current logistics activity
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
            <Truck className="h-4 w-4 text-cyan-600" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50">
            <Truck className="h-7 w-7 text-cyan-600" />
          </div>

          <div>
            <p className="text-3xl font-bold text-slate-900">
              {formatNumber(total)}
            </p>

            <p className="text-xs text-slate-400">Total shipments</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-500" />

              <span className="text-xs font-medium text-slate-600">
                Pending
              </span>
            </div>

            <span className="text-sm font-bold text-slate-900">
              {formatNumber(pending)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <StatusBreakdown data={shipment} />
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
  });

  const widgets = data?.widgets || [];

  const sales = getWidget(widgets, "sales-summary");
  const purchases = getWidget(widgets, "purchase-summary");
  const inventory = getWidget(widgets, "inventory-health");
  const quality = getWidget(widgets, "quality-health");
  const finance = getWidget(widgets, "finance-outstanding");
  const shipments = getWidget(widgets, "shipment-pipeline");

  const overview = useMemo(() => {
    return {
      sales: Number(sales?.totalValue || 0),
      purchases: Number(purchases?.totalValue || 0),
      inventory: Number(inventory?.totalValue || 0),
      outstanding: Number(finance?.totalOutstanding || 0),
    };
  }, [sales, purchases, inventory, finance]);

  return (
    <div className="space-y-5">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`}
          description="Here's what's happening across your trading operations today."
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-fit border-slate-200 bg-white"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* =====================================================
          TOP KPI ROW
      ====================================================== */}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Sales"
            value={formatMoney(overview.sales)}
            subtitle={`${formatNumber(sales?.totalOrders || 0)} total orders`}
            icon={ShoppingCart}
            iconClass="bg-indigo-50 text-indigo-600"
            trend={`${formatNumber(
              getStatusCount(sales, "CONFIRMED"),
            )} confirmed`}
            trendType="up"
          />

          <KpiCard
            title="Purchases"
            value={formatMoney(overview.purchases)}
            subtitle={`${formatNumber(
              purchases?.totalOrders || 0,
            )} purchase orders`}
            icon={ClipboardList}
            iconClass="bg-blue-50 text-blue-600"
            trend={`${formatNumber(
              getStatusCount(purchases, "APPROVED"),
            )} approved`}
            trendType="up"
          />

          <KpiCard
            title="Inventory"
            value={formatMoney(overview.inventory)}
            subtitle={`${formatNumber(
              inventory?.totalOnHand || 0,
            )} units on hand`}
            icon={Boxes}
            iconClass="bg-violet-50 text-violet-600"
            trend={
              Number(inventory?.lowStockCount || 0) > 0
                ? `${inventory.lowStockCount} low stock`
                : "Inventory healthy"
            }
            trendType={
              Number(inventory?.lowStockCount || 0) > 0 ? "down" : "up"
            }
          />

          <KpiCard
            title="Outstanding"
            value={formatMoney(overview.outstanding)}
            subtitle="Receivables + payables"
            icon={ReceiptText}
            iconClass="bg-amber-50 text-amber-600"
            trend={`${formatMoney(
              finance?.receivableOutstanding || 0,
            )} receivable`}
            trendType="neutral"
          />
        </div>
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}

      {isError && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <Activity className="h-5 w-5 text-rose-600" />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Couldn't load the dashboard
                </p>

                <p className="text-sm text-slate-500">
                  The dashboard service may be starting up.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => refetch()}
              className="bg-white"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!isLoading && !isError && widgets.length === 0 && (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No widgets for your role"
              description="Ask an administrator to assign dashboard widgets."
            />
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          TRADING + FINANCE
      ====================================================== */}

      {!isLoading && !isError && widgets.length > 0 && (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            {sales && purchases && (
              <TradingOverview sales={sales} purchases={purchases} />
            )}

            {finance && <FinanceCard finance={finance} />}
          </div>

          {/* =================================================
              OPERATIONS
          ================================================== */}

          <div>
            <SectionHeader
              icon={Activity}
              title="Operations"
              description="Inventory, quality and logistics health"
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {inventory && <InventoryCard inventory={inventory} />}

              {quality && <QualityCard quality={quality} />}

              {shipments && <ShipmentCard shipment={shipments} />}
            </div>
          </div>

          {/* =================================================
              STATUS OVERVIEW
          ================================================== */}

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Status Overview
                  </CardTitle>

                  <p className="mt-1 text-xs text-slate-400">
                    Current workflow distribution
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <Activity className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {widgets.map((widget) => {
                  const Icon = WIDGET_ICON[widget.key] || TrendingUp;

                  const accent =
                    WIDGET_ACCENT[widget.key] || WIDGET_ACCENT["sales-summary"];

                  return (
                    <div
                      key={widget.key}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.icon}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {widget.title}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {widget.available === false
                              ? "Unavailable"
                              : "Live"}
                          </p>
                        </div>
                      </div>

                      <StatusBreakdown data={widget} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* =====================================================
          FOOTER
      ====================================================== */}

      {data?.generatedAt && (
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Last updated {formatDate(data.generatedAt)}
        </div>
      )}
    </div>
  );
}
