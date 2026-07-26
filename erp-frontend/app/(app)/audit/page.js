'use client';

import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { auditApi } from '@/lib/api/services';
import { formatDateTime } from '@/lib/utils';

export default function AuditPage() {
  const columns = [
    { key: 'createdAt', header: 'When', render: (a) => formatDateTime(a.createdAt) },
    { key: 'actorName', header: 'Actor', render: (a) => a.actorName || a.userId?.slice(0, 8) || 'System' },
    { key: 'action', header: 'Action', render: (a) => <StatusBadge status={a.action} /> },
    { key: 'entityType', header: 'Entity', render: (a) => (
      <div className="leading-tight">
        <p className="text-slate-900">{a.entityType}</p>
        <p className="text-xs text-muted-foreground">{a.entityId?.slice(0, 12)}</p>
      </div>
    ) },
    { key: 'ipAddress', header: 'IP', render: (a) => a.ipAddress || '—' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Every workflow action, recorded for traceability." crumbs={[{ label: 'Settings' }, { label: 'Audit log' }]} />
      <ResourceList queryKey={['audit-log']} fetcher={auditApi.list} columns={columns} searchPlaceholder="Search audit log…" emptyTitle="No activity recorded yet" />
    </div>
  );
}
