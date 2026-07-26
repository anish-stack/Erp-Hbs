'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, PackageCheck, PackagePlus, Truck, CheckCircle2, XCircle, Plus, Loader2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { shipmentApi, salesApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const ACTIONS = [
  { verb: 'pick-tasks', label: 'Create pick tasks', icon: PackagePlus },
  { verb: 'pack', label: 'Mark packed', icon: PackageCheck },
  { verb: 'dispatch', label: 'Dispatch', icon: Truck },
  { verb: 'deliver', label: 'Mark delivered', icon: CheckCircle2 },
  { verb: 'cancel', label: 'Cancel', icon: XCircle, destructive: true }
];

const VERB_FN = {
  'pick-tasks': (id) => shipmentApi.createPickTasks(id),
  pack: (id) => shipmentApi.pack(id, {}),
  dispatch: (id, reason) => shipmentApi.dispatch(id, { carrier: reason || 'Own fleet' }),
  deliver: (id) => shipmentApi.deliver(id),
  cancel: (id, reason) => shipmentApi.cancel(id, reason)
};

function CreateShipmentDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState('');

  const fetchOrders = async (q) => {
    const res = await salesApi.orders({ search: q, limit: 20 });
    return (res.items || []).map((o) => ({ id: o.id, label: `${o.code} — ${o.customerName || o.customer?.name || ''}` }));
  };

  const mutation = useMutation({
    mutationFn: () => shipmentApi.fromOrder(orderId),
    onSuccess: () => {
      toast.success('Shipment created from order');
      qc.invalidateQueries({ queryKey: ['shipments'] });
      onOpenChange(false);
      setOrderId('');
    },
    onError: (e) => toast.error(apiError(e))
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New shipment</DialogTitle>
          <DialogDescription>Generate a shipment from a confirmed sales order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Sales order</Label>
          <AsyncSelect value={orderId} onChange={setOrderId} fetcher={fetchOrders} placeholder="Search order…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !orderId}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShipmentPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: ({ id, verb, reason }) => VERB_FN[verb](id, reason),
    onSuccess: (_, { label }) => { toast.success(label); qc.invalidateQueries({ queryKey: ['shipments'] }); setConfirm(null); setReason(''); },
    onError: (e) => toast.error(apiError(e))
  });

  const columns = [
    { key: 'code', header: 'Shipment', render: (s) => <span className="font-medium text-slate-900">{s.code || s.id?.slice(0, 8)}</span> },
    { key: 'orderCode', header: 'Order', render: (s) => s.orderCode || s.order?.code || '—' },
    { key: 'customerName', header: 'Customer', render: (s) => s.customerName || s.customer?.name || '—' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'dispatchedAt', header: 'Dispatched', render: (s) => formatDate(s.dispatchedAt) },
    {
      key: 'actions', header: '', align: 'right',
      render: (s) => (
        <Protected permission="shipment.update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Shipment</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <DropdownMenuItem key={a.verb} onClick={(e) => { e.stopPropagation(); setConfirm({ shipment: s, action: a }); }} className={a.destructive ? 'text-destructive focus:text-destructive' : ''}>
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
        title="Shipments"
        description="Pick, pack, dispatch, and deliver against sales orders."
        crumbs={[{ label: 'Operations' }, { label: 'Shipments' }]}
        actions={
          <Protected permission="shipment.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New shipment</Button>
          </Protected>
        }
      />
      <ResourceList queryKey={['shipments']} fetcher={shipmentApi.list} columns={columns} searchPlaceholder="Search shipments…" emptyTitle="No shipments yet" />
      <CreateShipmentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) { setConfirm(null); setReason(''); } }}
        title={confirm ? `${confirm.action.label}?` : ''}
        description={confirm?.action.verb === 'cancel' || confirm?.action.verb === 'dispatch' ? null : 'This updates the shipment workflow status.'}
        extra={(confirm?.action.verb === 'cancel' || confirm?.action.verb === 'dispatch') && (
          <div className="space-y-2 px-6 pb-2">
            <Label className="text-xs">{confirm.action.verb === 'dispatch' ? 'Carrier (optional)' : 'Reason'}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        )}
        confirmLabel={confirm?.action.label}
        destructive={confirm?.action.destructive}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.shipment.id, verb: confirm.action.verb, reason, label: confirm.action.label })}
      />
    </div>
  );
}
