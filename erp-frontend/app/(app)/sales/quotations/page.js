'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, Send, CheckCircle2, XCircle, ArrowRightCircle, Plus, Loader2 } from 'lucide-react';
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
import { salesApi, customersApi } from '@/lib/api/services';
import { formatMoney, formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const ACTIONS = [
  { verb: 'send', label: 'Send to customer', icon: Send },
  { verb: 'accept', label: 'Mark accepted', icon: CheckCircle2 },
  { verb: 'reject', label: 'Mark rejected', icon: XCircle, destructive: true },
  { verb: 'convert', label: 'Convert to order', icon: ArrowRightCircle }
];

const VERB_FN = {
  send: (id) => salesApi.quotationAction(id, 'send'),
  accept: (id) => salesApi.quotationAction(id, 'accept'),
  reject: (id) => salesApi.quotationAction(id, 'reject'),
  convert: (id) => salesApi.quotationAction(id, 'convert')
};

function CreateQuotationDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { customerId: '', validUntil: '', terms: '', notes: '', lines: [] };
  const [form, setForm] = useState(empty);

  const fetchCustomers = async (q) => {
    const res = await customersApi.list({ search: q, limit: 20 });
    return (res.items || []).map((c) => ({ id: c.id, label: `${c.code} — ${c.legalName || c.name}` }));
  };

  const mutation = useMutation({
    mutationFn: () => salesApi.createQuotation({
      ...form,
      validUntil: form.validUntil || null,
      lines: form.lines.map((l) => ({
        partId: l.partId, partCode: l.partCode, description: l.description,
        quantity: Number(l.quantity), unitPrice: Number(l.unitPrice),
        discountPct: Number(l.discountPct) || 0, taxRatePct: Number(l.taxRatePct) || 0
      }))
    }),
    onSuccess: () => {
      toast.success('Quotation created');
      qc.invalidateQueries({ queryKey: ['quotations'] });
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
          <DialogTitle>New quotation</DialogTitle>
          <DialogDescription>Draft a quote for a customer, send it, then convert to an order once accepted.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Customer</Label>
            <AsyncSelect value={form.customerId} onChange={set('customerId')} fetcher={fetchCustomers} placeholder="Search customer…" />
          </div>
          <div className="space-y-2"><Label>Valid until</Label><Input type="date" value={form.validUntil} onChange={set('validUntil')} /></div>
          <LineItemsEditor value={form.lines} onChange={(lines) => setForm((f) => ({ ...f, lines }))} />
          <div className="space-y-2"><Label>Terms</Label><Textarea value={form.terms} onChange={set('terms')} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.customerId || form.lines.length === 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function QuotationsPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ id, verb }) => VERB_FN[verb](id),
    onSuccess: (_, { label }) => {
      toast.success(`${label} done`);
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setConfirm(null);
    },
    onError: (e) => { toast.error(apiError(e)); setConfirm(null); }
  });

  const columns = [
    { key: 'code', header: 'Quote', render: (q) => <span className="font-medium text-slate-900">{q.code}</span> },
    { key: 'customerName', header: 'Customer', render: (q) => q.customerName || q.customer?.name || '—' },
    { key: 'validUntil', header: 'Valid until', render: (q) => formatDate(q.validUntil || q.expiryDate) },
    { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status} /> },
    { key: 'grandTotal', header: 'Total', align: 'right', render: (q) => formatMoney(q.grandTotal) },
    {
      key: 'actions', header: '', align: 'right',
      render: (q) => (
        <Protected anyOf={['sales.update', 'sales.create']}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quote actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <DropdownMenuItem
                    key={a.verb}
                    onClick={(e) => { e.stopPropagation(); setConfirm({ quote: q, verb: a.verb, label: a.label, destructive: a.destructive }); }}
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
        title="Quotations"
        description="Draft, send, and convert quotes into orders."
        crumbs={[{ label: 'Sales' }, { label: 'Quotations' }]}
        actions={
          <Protected permission="sales.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New quotation</Button>
          </Protected>
        }
      />
      <ResourceList queryKey={['quotations']} fetcher={salesApi.quotations} columns={columns} searchPlaceholder="Search quotations…" emptyTitle="No quotations yet" />
      <CreateQuotationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `${confirm.label} ${confirm.quote.code}?` : ''}
        description="This updates the quotation and is recorded in the audit log."
        confirmLabel={confirm?.label}
        destructive={confirm?.destructive}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.quote.id, verb: confirm.verb, label: confirm.label })}
      />
    </div>
  );
}
