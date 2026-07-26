'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, CheckCircle2, XCircle, Ban, PauseCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { suppliersApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

/* Workflow verbs the backend exposes on /suppliers/:id/<verb> */
const ACTIONS = [
  { verb: 'approve', label: 'Approve', icon: CheckCircle2, tone: 'default' },
  { verb: 'reject', label: 'Reject', icon: XCircle, tone: 'destructive' },
  { verb: 'hold', label: 'Put on hold', icon: PauseCircle, tone: 'default' },
  { verb: 'blacklist', label: 'Blacklist', icon: Ban, tone: 'destructive' }
];

const SUPPLIER_TYPES = ['MANUFACTURER', 'AUTHORISED_DISTRIBUTOR', 'DISTRIBUTOR', 'TRADER', 'BROKER', 'SERVICE_PROVIDER'];
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

function CreateSupplierDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { legalName: '', tradeName: '', type: 'DISTRIBUTOR', riskLevel: 'MEDIUM', email: '', phone: '', gstin: '', paymentTermDays: 30, defaultLeadTime: 7 };
  const [form, setForm] = useState(empty);

  const mutation = useMutation({
    mutationFn: () => suppliersApi.create({ ...form, paymentTermDays: Number(form.paymentTermDays), defaultLeadTime: Number(form.defaultLeadTime) }),
    onSuccess: () => {
      toast.success('Supplier created in draft');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
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
          <DialogTitle>New supplier</DialogTitle>
          <DialogDescription>Onboard a vendor. It starts in draft and moves through approval.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Legal name</Label><Input value={form.legalName} onChange={set('legalName')} /></div>
            <div className="space-y-2"><Label>Trade name</Label><Input value={form.tradeName} onChange={set('tradeName')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={set('type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUPPLIER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk level</Label>
              <Select value={form.riskLevel} onValueChange={set('riskLevel')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_LEVELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={set('email')} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} placeholder="+91…" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={set('gstin')} maxLength={15} className="uppercase" /></div>
            <div className="space-y-2"><Label>Payment terms (days)</Label><Input type="number" value={form.paymentTermDays} onChange={set('paymentTermDays')} /></div>
            <div className="space-y-2"><Label>Lead time (days)</Label><Input type="number" value={form.defaultLeadTime} onChange={set('defaultLeadTime')} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.legalName}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null); // { supplier, action }
  const [createOpen, setCreateOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ id, verb }) => suppliersApi.action(id, verb),
    onSuccess: (_, { label }) => {
      toast.success(`Supplier ${label.toLowerCase()}d`);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setConfirm(null);
    },
    onError: (e) => { toast.error(apiError(e)); setConfirm(null); }
  });

  const columns = [
    { key: 'code', header: 'Code', render: (s) => <span className="font-medium text-slate-900">{s.code}</span> },
    { key: 'name', header: 'Supplier', render: (s) => (
      <div className="leading-tight">
        <p className="font-medium text-slate-900">{s.name || s.legalName}</p>
        <p className="text-xs text-muted-foreground">{s.city || s.email || '—'}</p>
      </div>
    ) },
    { key: 'category', header: 'Category', render: (s) => s.category || s.type || '—' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'createdAt', header: 'Added', render: (s) => formatDate(s.createdAt) },
    {
      key: 'actions', header: '', align: 'right',
      render: (s) => (
        <Protected permission="supplier.approve">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Workflow</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <DropdownMenuItem
                    key={a.verb}
                    onClick={(e) => { e.stopPropagation(); setConfirm({ supplier: s, action: a }); }}
                    className={a.tone === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                  >
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
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Vendor master and onboarding workflow."
        crumbs={[{ label: 'Procurement' }, { label: 'Suppliers' }]}
        actions={
          <Protected permission="supplier.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New supplier</Button>
          </Protected>
        }
      />
      <ResourceList
        queryKey={['suppliers']}
        fetcher={suppliersApi.list}
        columns={columns}
        searchPlaceholder="Search suppliers…"
        emptyTitle="No suppliers yet"
        emptyDescription="Onboard your first vendor to begin sourcing."
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `${confirm.action.label} ${confirm.supplier.name || confirm.supplier.code}?` : ''}
        description="This updates the supplier's workflow status and is recorded in the audit log."
        confirmLabel={confirm?.action.label}
        destructive={confirm?.action.tone === 'destructive'}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.supplier.id, verb: confirm.action.verb, label: confirm.action.label })}
      />
      <CreateSupplierDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
