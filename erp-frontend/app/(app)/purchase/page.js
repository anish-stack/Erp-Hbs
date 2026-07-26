'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, CheckCircle2, XCircle, Send, PackageCheck, Lock, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Protected } from '@/components/shared/protected';
import { AsyncSelect } from '@/components/shared/async-select';
import { LineItemsEditor } from '@/components/shared/line-items-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { purchaseApi, suppliersApi } from '@/lib/api/services';
import { formatMoney, formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const ACTIONS = [
  { verb: 'submit', label: 'Submit for approval', icon: Send },
  { verb: 'approve', label: 'Approve', icon: CheckCircle2 },
  { verb: 'reject', label: 'Reject', icon: XCircle, destructive: true, needsReason: true },
  { verb: 'issue', label: 'Issue to supplier', icon: PackageCheck },
  { verb: 'close', label: 'Close', icon: Lock },
  { verb: 'cancel', label: 'Cancel', icon: XCircle, destructive: true, needsReason: true }
];

const VERB_FN = {
  submit: (id) => purchaseApi.submit(id),
  approve: (id) => purchaseApi.approve(id),
  reject: (id, reason) => purchaseApi.reject(id, reason),
  issue: (id) => purchaseApi.issue(id),
  close: (id) => purchaseApi.close(id),
  cancel: (id, reason) => purchaseApi.cancel(id, reason)
};

function CreatePODialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { supplierId: '', expectedDate: '', paymentTermDays: 30, incoterm: '', deliveryAddress: '', notes: '', lines: [] };
  const [form, setForm] = useState(empty);

  const fetchSuppliers = async (q) => {
    const res = await suppliersApi.list({ search: q, limit: 20 });
    return (res.items || []).map((s) => ({ id: s.id, label: `${s.code} — ${s.legalName || s.name}` }));
  };

  const mutation = useMutation({
    mutationFn: () => purchaseApi.create({
      ...form,
      paymentTermDays: Number(form.paymentTermDays),
      expectedDate: form.expectedDate || null,
      lines: form.lines.map((l) => ({
        partId: l.partId, partNumber: l.partCode, description: l.description,
        quantity: Number(l.quantity), uomCode: l.uomCode || 'PCS',
        unitPrice: Number(l.unitPrice), discountPercent: Number(l.discountPct) || 0, taxPercent: Number(l.taxRatePct) || 0
      }))
    }),
    onSuccess: () => {
      toast.success('Purchase order created');
      qc.invalidateQueries({ queryKey: ['purchase'] });
      onOpenChange(false);
      setForm(empty);
    },
    onError: (e) => toast.error(apiError(e))
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>Raise a PO against a supplier. Starts in draft.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <AsyncSelect value={form.supplierId} onChange={set('supplierId')} fetcher={fetchSuppliers} placeholder="Search supplier…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Expected date</Label><Input type="date" value={form.expectedDate} onChange={set('expectedDate')} /></div>
            <div className="space-y-2"><Label>Payment terms (days)</Label><Input type="number" value={form.paymentTermDays} onChange={set('paymentTermDays')} /></div>
            <div className="space-y-2"><Label>Incoterm</Label><Input value={form.incoterm} onChange={set('incoterm')} placeholder="FOB" /></div>
          </div>
          <div className="space-y-2"><Label>Delivery address</Label><Textarea value={form.deliveryAddress} onChange={set('deliveryAddress')} rows={2} /></div>
          <LineItemsEditor value={form.lines} onChange={(lines) => setForm((f) => ({ ...f, lines }))} />
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={set('notes')} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.supplierId || form.lines.length === 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create PO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchasePage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: ({ id, verb, reason }) => VERB_FN[verb](id, reason),
    onSuccess: (_, { label }) => {
      toast.success(`${label} done`);
      qc.invalidateQueries({ queryKey: ['purchase'] });
      setConfirm(null);
      setReason('');
    },
    onError: (e) => { toast.error(apiError(e)); }
  });

  const columns = [
    { key: 'code', header: 'PO', render: (p) => <span className="font-medium text-slate-900">{p.code}</span> },
    { key: 'supplierName', header: 'Supplier', render: (p) => p.supplierName || p.supplier?.name || p.supplier?.legalName || '—' },
    { key: 'expectedDate', header: 'Expected', render: (p) => formatDate(p.expectedDate) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'grandTotal', header: 'Total', align: 'right', render: (p) => formatMoney(p.grandTotal) },
    {
      key: 'actions', header: '', align: 'right',
      render: (p) => (
        <Protected anyOf={['purchase.update', 'purchase.approve']}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>PO actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <DropdownMenuItem
                    key={a.verb}
                    onClick={(e) => { e.stopPropagation(); setConfirm({ po: p, action: a }); }}
                    className={a.destructive ? 'text-destructive focus:text-destructive' : ''}
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
        title="Purchase orders"
        description="Raise, approve, and receive against supplier POs."
        crumbs={[{ label: 'Procurement' }, { label: 'Purchase orders' }]}
        actions={
          <Protected permission="purchase.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New PO</Button>
          </Protected>
        }
      />
      <ResourceList queryKey={['purchase']} fetcher={purchaseApi.list} columns={columns} searchPlaceholder="Search purchase orders…" emptyTitle="No purchase orders yet" />
      <CreatePODialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) { setConfirm(null); setReason(''); } }}
        title={confirm ? `${confirm.action.label} ${confirm.po.code}?` : ''}
        description={
          confirm?.action.needsReason ? null : 'This updates the PO workflow status and is recorded in the audit log.'
        }
        extra={confirm?.action.needsReason && (
          <div className="space-y-2 px-6 pb-2">
            <Label className="text-xs">Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why?" />
          </div>
        )}
        confirmLabel={confirm?.action.label}
        destructive={confirm?.action.destructive}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.po.id, verb: confirm.action.verb, reason, label: confirm.action.label })}
      />
    </div>
  );
}
