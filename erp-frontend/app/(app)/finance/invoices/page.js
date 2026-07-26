'use client';

import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { financeApi } from '@/lib/api/services';
import { formatMoney, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const columns = [
    { key: 'code', header: 'Invoice', render: (i) => <span className="font-medium text-slate-900">{i.code}</span> },
    { key: 'type', header: 'Type', render: (i) => <Badge variant="outline">{i.type === 'AP' ? 'Payable' : 'Receivable'}</Badge> },
    { key: 'partyName', header: 'Party', render: (i) => i.partyName || i.customerName || i.supplierName || '—' },
    { key: 'dueDate', header: 'Due', render: (i) => formatDate(i.dueDate) },
    { key: 'grandTotal', header: 'Total', align: 'right', render: (i) => formatMoney(i.grandTotal) },
    { key: 'amountDue', header: 'Due', align: 'right', render: (i) => formatMoney(i.amountDue) },
    { key: 'status', header: 'Status', align: 'right', render: (i) => <StatusBadge status={i.status} /> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Receivables and payables with GST breakdown." crumbs={[{ label: 'Finance' }, { label: 'Invoices' }]} />
      <ResourceList queryKey={['invoices']} fetcher={financeApi.invoices} columns={columns} searchPlaceholder="Search invoices…" emptyTitle="No invoices yet" />
    </div>
  );
}
