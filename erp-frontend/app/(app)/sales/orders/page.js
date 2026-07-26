'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, CheckCircle2, XCircle, Lock, Plus, Loader2 } from 'lucide-react';
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

function CreateOrderDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { customerId: '', requiredDate: '', paymentTermDays: 30, terms: '', notes: '', lines: [] };
  const [form, setForm] = useState(empty);

  const fetchCustomers = async (q) => {
    const res = await customersApi.list({ search: q, limit: 20 });
    return (res.items || []).map((c) => ({ id: c.id, label: `${c.code} — ${c.legalName || c.name}` }));
  };

  const mutation = useMutation({
    mutationFn: () => salesApi.createOrder({
      ...form,
      paymentTermDays: Number(form.paymentTermDays),
      requiredDate: form.requiredDate || null,
      lines: form.lines.map((l) => ({
        partId: l.partId, partCode: l.partCode, description: l.description,
        quantity: Number(l.quantity), unitPrice: Number(l.unitPrice),
        discountPct: Number(l.discountPct) || 0, taxRatePct: Number(l.taxRatePct) || 0
      }))
    }),
    onSuccess: () => {
      toast.success('Sales order created');
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
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
          <DialogTitle>New sales order</DialogTitle>
          <DialogDescription>Confirming later reserves stock and triggers invoice + shipment.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Customer</Label>
            <AsyncSelect value={form.customerId} onChange={set('customerId')} fetcher={fetchCustomers} placeholder="Search customer…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Required date</Label><Input type="date" value={form.requiredDate} onChange={set('requiredDate')} /></div>
            <div className="space-y-2"><Label>Payment terms (days)</Label><Input type="number" value={form.paymentTermDays} onChange={set('paymentTermDays')} /></div>
          </div>
          <LineItemsEditor value={form.lines} onChange={(lines) => setForm((f) => ({ ...f, lines }))} />
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={set('notes')} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.customerId || form.lines.length === 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesOrdersPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ id, verb }) => salesApi.orderAction(id, verb),
    onSuccess: (data, { label }) => {
      const shortfalls = data?.shortfalls || [];
      if (shortfalls.length) {
        toast.warning(`Order ${label.toLowerCase()}d with ${shortfalls.length} stock shortfall(s). Check reservations.`);
      } else {
        toast.success(`Order ${label.toLowerCase()}d`);
      }
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setConfirm(null);
    },
    onError: (e) => { toast.error(apiError(e)); setConfirm(null); }
  });

  const columns = [
    { key: 'code', header: 'Order', render: (o) => <span className="font-medium text-slate-900">{o.code}</span> },
    { key: 'customerName', header: 'Customer', render: (o) => o.customerName || o.customer?.name || '—' },
    { key: 'orderDate', header: 'Date', render: (o) => formatDate(o.orderDate || o.createdAt) },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'grandTotal', header: 'Total', align: 'right', render: (o) => formatMoney(o.grandTotal) },
    {
      key: 'actions', header: '', align: 'right',
      render: (o) => (
        <Protected anyOf={['sales.update', 'sales.approve']}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Order actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirm({ order: o, verb: 'confirm', label: 'Confirm' }); }}>
                <CheckCircle2 className="h-4 w-4" /> Confirm order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirm({ order: o, verb: 'close', label: 'Close' }); }}>
                <Lock className="h-4 w-4" /> Close order
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setConfirm({ order: o, verb: 'cancel', label: 'Cancel', destructive: true }); }}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="h-4 w-4" /> Cancel order
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
        title="Sales orders"
        description="Confirm to reserve stock and auto-generate the invoice and shipment."
        crumbs={[{ label: 'Sales' }, { label: 'Sales orders' }]}
        actions={
          <Protected permission="sales.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New order</Button>
          </Protected>
        }
      />
      <ResourceList
        queryKey={['sales-orders']}
        fetcher={salesApi.orders}
        columns={columns}
        searchPlaceholder="Search orders…"
        emptyTitle="No sales orders"
        emptyDescription="Confirmed quotations become sales orders here."
      />
      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `${confirm.label} ${confirm.order.code}?` : ''}
        description={
          confirm?.verb === 'confirm'
            ? 'Confirming reserves stock and triggers invoice + shipment creation downstream.'
            : confirm?.verb === 'cancel'
            ? 'Cancelling releases any reserved stock. This cannot be undone.'
            : 'This closes the order to further fulfilment.'
        }
        confirmLabel={confirm?.label}
        destructive={confirm?.destructive}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.order.id, verb: confirm.verb, label: confirm.label })}
      />
    </div>
  );
}
