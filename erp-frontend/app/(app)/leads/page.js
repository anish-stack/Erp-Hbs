'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, ArrowRightCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { leadsApi } from '@/lib/api/services';
import { formatMoney, formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EXHIBITION', 'ADVERTISEMENT', 'OTHER'];
const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

function CreateLeadDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { companyName: '', contactName: '', email: '', phone: '', source: 'OTHER', estimatedValue: '', city: '', notes: '' };
  const [form, setForm] = useState(empty);

  const mutation = useMutation({
    mutationFn: () => leadsApi.create({ ...form, estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null }),
    onSuccess: () => {
      toast.success('Lead created');
      qc.invalidateQueries({ queryKey: ['leads'] });
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
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>Track a prospective account through the pipeline.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Company name</Label><Input value={form.companyName} onChange={set('companyName')} /></div>
            <div className="space-y-2"><Label>Contact name</Label><Input value={form.contactName} onChange={set('contactName')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={set('email')} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={set('source')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Est. value</Label><Input type="number" value={form.estimatedValue} onChange={set('estimatedValue')} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={set('city')} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={set('notes')} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.companyName || !form.contactName}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState(null); // { lead, stage }
  const [convertTarget, setConvertTarget] = useState(null);

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }) => leadsApi.setStage(id, stage),
    onSuccess: () => { toast.success('Stage updated'); qc.invalidateQueries({ queryKey: ['leads'] }); setStageTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setStageTarget(null); }
  });

  const convertMutation = useMutation({
    mutationFn: (id) => leadsApi.convert(id),
    onSuccess: () => { toast.success('Lead converted to customer'); qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['customers'] }); setConvertTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConvertTarget(null); }
  });

  const columns = [
    { key: 'companyName', header: 'Lead', render: (l) => (
      <div className="leading-tight">
        <p className="font-medium text-slate-900">{l.companyName}</p>
        <p className="text-xs text-muted-foreground">{l.contactName}</p>
      </div>
    ) },
    { key: 'source', header: 'Source', render: (l) => <span className="capitalize">{(l.source || '').replaceAll('_', ' ').toLowerCase()}</span> },
    { key: 'estimatedValue', header: 'Est. value', align: 'right', render: (l) => formatMoney(l.estimatedValue) },
    { key: 'stage', header: 'Stage', render: (l) => <StatusBadge status={l.stage} /> },
    { key: 'nextFollowUpAt', header: 'Next follow-up', render: (l) => formatDate(l.nextFollowUpAt) },
    {
      key: 'actions', header: '', align: 'right',
      render: (l) => (
        <Protected permission="lead.update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Move stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STAGES.map((s) => (
                <DropdownMenuItem key={s} onClick={(e) => { e.stopPropagation(); setStageTarget({ lead: l, stage: s }); }}>
                  {s.replaceAll('_', ' ')}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConvertTarget(l); }}>
                <ArrowRightCircle className="h-4 w-4" /> Convert to customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Protected>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="The CRM pipeline — new prospects through to won or lost."
        crumbs={[{ label: 'Sales' }, { label: 'Leads' }]}
        actions={
          <Protected permission="lead.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New lead</Button>
          </Protected>
        }
      />
      <ResourceList queryKey={['leads']} fetcher={leadsApi.list} columns={columns} searchPlaceholder="Search leads…" emptyTitle="No leads yet" />
      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!stageTarget}
        onOpenChange={(o) => !o && setStageTarget(null)}
        title={stageTarget ? `Move ${stageTarget.lead.companyName} to ${stageTarget.stage.replaceAll('_', ' ')}?` : ''}
        confirmLabel="Move"
        loading={stageMutation.isPending}
        onConfirm={() => stageMutation.mutate({ id: stageTarget.lead.id, stage: stageTarget.stage })}
      />
      <ConfirmDialog
        open={!!convertTarget}
        onOpenChange={(o) => !o && setConvertTarget(null)}
        title={convertTarget ? `Convert ${convertTarget.companyName} to a customer?` : ''}
        description="Creates a customer account linked to this lead."
        confirmLabel="Convert"
        loading={convertMutation.isPending}
        onConfirm={() => convertMutation.mutate(convertTarget.id)}
      />
    </div>
  );
}
