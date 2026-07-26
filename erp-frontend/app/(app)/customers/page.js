'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { customersApi } from '@/lib/api/services';
import { formatMoney } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const CUSTOMER_TYPES = ['BUSINESS', 'INDIVIDUAL', 'GOVERNMENT'];
const SEGMENTS = ['ENTERPRISE', 'SMB', 'STARTUP', 'GOVERNMENT', 'RETAIL'];

function CreateCustomerDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { legalName: '', tradeName: '', type: 'BUSINESS', segment: 'SMB', email: '', phone: '', gstin: '', paymentTermDays: 30, creditLimit: 0 };
  const [form, setForm] = useState(empty);

  const mutation = useMutation({
    mutationFn: () => customersApi.create({ ...form, paymentTermDays: Number(form.paymentTermDays), creditLimit: Number(form.creditLimit) }),
    onSuccess: () => {
      toast.success('Customer created');
      qc.invalidateQueries({ queryKey: ['customers'] });
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
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>Add a customer account with credit terms.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Legal name</Label><Input value={form.legalName} onChange={set('legalName')} placeholder="Acme Pvt Ltd" /></div>
            <div className="space-y-2"><Label>Trade name</Label><Input value={form.tradeName} onChange={set('tradeName')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={set('type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={form.segment} onValueChange={set('segment')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEGMENTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
            <div className="space-y-2"><Label>Credit limit</Label><Input type="number" value={form.creditLimit} onChange={set('creditLimit')} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.legalName}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const columns = [
    { key: 'code', header: 'Code', render: (c) => <span className="font-medium text-slate-900">{c.code}</span> },
    { key: 'name', header: 'Customer', render: (c) => (
      <div className="leading-tight"><p className="font-medium text-slate-900">{c.name}</p><p className="text-xs text-muted-foreground">{c.email || c.city || '—'}</p></div>
    ) },
    { key: 'creditLimit', header: 'Credit limit', align: 'right', render: (c) => formatMoney(c.creditLimit) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (c) => formatMoney(c.outstanding ?? c.creditUsed) },
    { key: 'status', header: 'Status', align: 'right', render: (c) => <StatusBadge status={c.status || (c.isActive ? 'ACTIVE' : 'INACTIVE')} /> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Accounts, credit, and relationship status."
        crumbs={[{ label: 'Sales' }, { label: 'Customers' }]}
        actions={
          <Protected permission="customer.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New customer</Button>
          </Protected>
        }
      />
      <ResourceList queryKey={['customers']} fetcher={customersApi.list} columns={columns} searchPlaceholder="Search customers…" emptyTitle="No customers yet" />
      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
