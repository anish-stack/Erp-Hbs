'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FileBarChart, Play, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { reportsApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

function DefinitionsGrid() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['report-definitions'], queryFn: () => reportsApi.definitions() });
  const definitions = data?.definitions || data || [];

  const runMutation = useMutation({
    mutationFn: (code) => reportsApi.request({ reportCode: code }),
    onSuccess: () => { toast.success('Report queued — check the Runs tab shortly'); qc.invalidateQueries({ queryKey: ['report-runs'] }); },
    onError: (e) => toast.error(apiError(e))
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading report catalog…</p>;

  const list = Array.isArray(definitions) ? definitions : [];
  if (list.length === 0) return <p className="text-sm text-muted-foreground">No report definitions configured.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((d) => (
        <div key={d.code || d.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            <p className="font-medium text-slate-900">{d.name || d.code}</p>
          </div>
          <p className="flex-1 text-xs text-muted-foreground">{d.description || 'No description provided.'}</p>
          <Button size="sm" variant="outline" onClick={() => runMutation.mutate(d.code)} disabled={runMutation.isPending}>
            <Play className="h-3.5 w-3.5" /> Run report
          </Button>
        </div>
      ))}
    </div>
  );
}

function RunsList() {
  const columns = [
    { key: 'reportCode', header: 'Report', render: (r) => <span className="font-medium text-slate-900">{r.reportName || r.reportCode}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'requestedAt', header: 'Requested', render: (r) => formatDate(r.requestedAt || r.createdAt) },
    {
      key: 'download', header: '', align: 'right',
      render: (r) => r.fileUrl ? (
        <a href={r.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      ) : null
    }
  ];
  return <ResourceList queryKey={['report-runs']} fetcher={reportsApi.runs} columns={columns} searchPlaceholder="Search runs…" emptyTitle="No report runs yet" />;
}

export default function ReportsPage() {
  const [tab, setTab] = useState('catalog');
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Run and download reports across every module." crumbs={[{ label: 'Reports' }]} />
      <div className="flex gap-2 border-b border-border pb-2">
        <Button variant={tab === 'catalog' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('catalog')}>Catalog</Button>
        <Button variant={tab === 'runs' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('runs')}>Runs</Button>
      </div>
      {tab === 'catalog' ? <DefinitionsGrid /> : <RunsList />}
    </div>
  );
}
