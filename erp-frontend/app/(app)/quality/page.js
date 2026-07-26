'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, PlayCircle, CheckCircle2, PauseCircle, XCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Protected } from '@/components/shared/protected';
import { AsyncSelect } from '@/components/shared/async-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { qualityApi, partsApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const ACTIONS = [
  { verb: 'start', label: 'Start inspection', icon: PlayCircle },
  { verb: 'complete', label: 'Mark complete', icon: CheckCircle2 },
  { verb: 'hold', label: 'Put on hold', icon: PauseCircle },
  { verb: 'cancel', label: 'Cancel', icon: XCircle, destructive: true }
];

const VERB_FN = {
  start: (id) => qualityApi.startInspection(id),
  complete: (id) => qualityApi.completeInspection(id),
  hold: (id, reason) => qualityApi.holdInspection(id, reason),
  cancel: (id, reason) => qualityApi.cancelInspection(id, reason)
};

function CreateInspectionDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { partId: '', referenceType: 'GRN', referenceId: '', notes: '' };
  const [form, setForm] = useState(empty);

  const fetchParts = async (q) => {
    const res = await partsApi.search(q || '');
    const list = Array.isArray(res) ? res : res?.items || [];
    return list.map((p) => ({ id: p.id, label: `${p.code || p.partCode} — ${p.name || p.description || ''}` }));
  };

  const mutation = useMutation({
    mutationFn: () => qualityApi.createInspection(form),
    onSuccess: () => {
      toast.success('Inspection created');
      qc.invalidateQueries({ queryKey: ['quality-inspections'] });
      onOpenChange(false);
      setForm(empty);
    },
    onError: (e) => toast.error(apiError(e))
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New inspection</DialogTitle>
          <DialogDescription>Raise a QC inspection against an incoming or in-process part.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Part</Label>
            <AsyncSelect value={form.partId} onChange={set('partId')} fetcher={fetchParts} placeholder="Search part…" />
          </div>
          <div className="space-y-2"><Label>Reference ID (GRN / batch)</Label><Input value={form.referenceId} onChange={set('referenceId')} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={set('notes')} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.partId}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InspectionsTab() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: ({ id, verb, reason }) => VERB_FN[verb](id, reason),
    onSuccess: (_, { label }) => { toast.success(label); qc.invalidateQueries({ queryKey: ['quality-inspections'] }); setConfirm(null); setReason(''); },
    onError: (e) => { toast.error(apiError(e)); }
  });

  const columns = [
    { key: 'code', header: 'Inspection', render: (i) => <span className="font-medium text-slate-900">{i.code || i.id?.slice(0, 8)}</span> },
    { key: 'partName', header: 'Part', render: (i) => i.partName || i.part?.description || '—' },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    { key: 'createdAt', header: 'Raised', align: 'right', render: (i) => formatDate(i.createdAt) },
    {
      key: 'actions', header: '', align: 'right',
      render: (i) => (
        <Protected permission="quality.update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Inspection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <DropdownMenuItem key={a.verb} onClick={(e) => { e.stopPropagation(); setConfirm({ inspection: i, action: a }); }} className={a.destructive ? 'text-destructive focus:text-destructive' : ''}>
                    <Icon className="h-4 w-4" /> {a.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </Protected>
      )
    }
  ];

  return (
    <>
      <div className="flex justify-end pb-3">
        <Protected permission="quality.create">
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New inspection</Button>
        </Protected>
      </div>
      <ResourceList queryKey={['quality-inspections']} fetcher={qualityApi.inspections} columns={columns} searchPlaceholder="Search inspections…" emptyTitle="No inspections yet" />
      <CreateInspectionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) { setConfirm(null); setReason(''); } }}
        title={confirm ? `${confirm.action.label}?` : ''}
        description={confirm?.action.verb === 'hold' || confirm?.action.verb === 'cancel' ? null : 'This updates the inspection workflow status.'}
        extra={(confirm?.action.verb === 'hold' || confirm?.action.verb === 'cancel') && (
          <div className="space-y-2 px-6 pb-2"><Label className="text-xs">Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
        )}
        confirmLabel={confirm?.action.label}
        destructive={confirm?.action.destructive}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.inspection.id, verb: confirm.action.verb, reason, label: confirm.action.label })}
      />
    </>
  );
}

function PlansTab() {
  const columns = [
    { key: 'name', header: 'Plan', render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
    { key: 'partName', header: 'Applies to', render: (p) => p.partName || p.category?.name || 'All parts' },
    { key: 'isActive', header: 'Status', render: (p) => <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} /> }
  ];
  return <ResourceList queryKey={['quality-plans']} fetcher={qualityApi.plans} columns={columns} searchPlaceholder="Search plans…" emptyTitle="No inspection plans yet" />;
}

export default function QualityPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Quality" description="Inspection plans and QC workflow." crumbs={[{ label: 'Operations' }, { label: 'Quality' }]} />
      <Tabs defaultValue="inspections">
        <TabsList>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>
        <TabsContent value="inspections"><InspectionsTab /></TabsContent>
        <TabsContent value="plans"><PlansTab /></TabsContent>
      </Tabs>
    </div>
  );
}
