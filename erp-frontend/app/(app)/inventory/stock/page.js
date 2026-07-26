'use client';

import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { inventoryApi } from '@/lib/api/services';
import { formatNumber, formatMoney } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function InventoryStockPage() {
  const columns = [
    { key: 'partCode', header: 'Part', render: (s) => (
      <div className="leading-tight">
        <p className="font-medium text-slate-900">{s.partCode}</p>
        <p className="text-xs text-muted-foreground">{s.partName}</p>
      </div>
    ) },
    { key: 'warehouseId', header: 'Warehouse', render: (s) => s.warehouseName || s.warehouseId?.slice(0, 8) || '—' },
    { key: 'binLocation', header: 'Bin', render: (s) => s.binLocation || '—' },
    { key: 'onHand', header: 'On hand', align: 'right', render: (s) => formatNumber(s.onHand, 2) },
    { key: 'reserved', header: 'Reserved', align: 'right', render: (s) => formatNumber(s.reserved, 2) },
    { key: 'available', header: 'Available', align: 'right', render: (s) => (
      <span className={cn('font-medium', Number(s.available) <= 0 ? 'text-destructive' : 'text-slate-900')}>{formatNumber(s.available, 2)}</span>
    ) },
    { key: 'totalValue', header: 'Value', align: 'right', render: (s) => formatMoney(s.totalValue) }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Live stock positions across every warehouse and bin."
        crumbs={[{ label: 'Operations' }, { label: 'Inventory' }]}
      />
      <ResourceList
        queryKey={['inventory-stock']}
        fetcher={inventoryApi.stock}
        columns={columns}
        searchPlaceholder="Search by part…"
        emptyTitle="No stock positions"
        emptyDescription="Stock appears here once goods are received."
      />
    </div>
  );
}
