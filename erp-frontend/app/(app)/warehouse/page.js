'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MoreHorizontal, Star, Power, PowerOff, Plus, Loader2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { warehouseApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

const WAREHOUSE_TYPES = ['MAIN', 'REGIONAL', 'TRANSIT', 'RETURNS', 'CONSIGNMENT'];

function CreateWarehouseDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { code: '', name: '', type: 'REGIONAL', city: '', state: '', country: 'India', address: '' };
  const [form, setForm] = useState(empty);

  const mutation = useMutation({
    mutationFn: () => warehouseApi.create(form),
    onSuccess: () => {
      toast.success('Warehouse created');
      qc.invalidateQueries({ queryKey: ['warehouses'] });
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
          <DialogTitle>New warehouse</DialogTitle>
          <DialogDescription>Add a storage location. Zones and bins can be added after.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={set('code')} placeholder="WH-DEL" /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={set('name')} /></div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={set('type')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WAREHOUSE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={set('city')} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={set('state')} /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={set('country')} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={set('address')} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.code || !form.name}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create warehouse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarehousesTab() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ id, verb }) => (verb === 'activate' ? warehouseApi.activate(id) : verb === 'deactivate' ? warehouseApi.deactivate(id) : warehouseApi.setDefault(id)),
    onSuccess: (_, { label }) => { toast.success(label); qc.invalidateQueries({ queryKey: ['warehouses'] }); setConfirm(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirm(null); }
  });

  const columns = [
    { key: 'code', header: 'Code', render: (w) => <span className="font-medium text-slate-900">{w.code}</span> },
    { key: 'name', header: 'Name', render: (w) => (
      <div className="leading-tight">
        <p className="font-medium text-slate-900">{w.name}</p>
        <p className="text-xs text-muted-foreground">{w.city || '—'}{w.isDefault ? ' · Default' : ''}</p>
      </div>
    ) },
    { key: 'type', header: 'Type', render: (w) => w.type },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={w.status || (w.isActive ? 'ACTIVE' : 'INACTIVE')} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (w) => (
        <Protected permission="warehouse.update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Warehouse</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirm({ w, verb: 'activate', label: 'Warehouse activated' }); }}><Power className="h-4 w-4" /> Activate</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirm({ w, verb: 'deactivate', label: 'Warehouse deactivated' }); }}><PowerOff className="h-4 w-4" /> Deactivate</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirm({ w, verb: 'default', label: 'Set as default' }); }}><Star className="h-4 w-4" /> Set as default</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Protected>
      )
    }
  ];

  return (
    <>
      <div className="flex justify-end pb-3">
        <Protected permission="warehouse.create">
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New warehouse</Button>
        </Protected>
      </div>
      <ResourceList queryKey={['warehouses']} fetcher={warehouseApi.list} columns={columns} searchPlaceholder="Search warehouses…" emptyTitle="No warehouses yet" />
      <CreateWarehouseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `${confirm.label}?` : ''}
        confirmLabel="Confirm"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: confirm.w.id, verb: confirm.verb, label: confirm.label })}
      />
    </>
  );
}

function TasksTab() {
  const columns = [
    { key: 'taskType', header: 'Type', render: (t) => <span className="capitalize">{(t.taskType || '').toLowerCase()}</span> },
    { key: 'refType', header: 'Reference', render: (t) => t.refType || '—' },
    { key: 'assignedTo', header: 'Assigned to', render: (t) => t.assignedToName || t.assignedTo || 'Unassigned' },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'createdAt', header: 'Created', align: 'right', render: (t) => formatDate(t.createdAt) }
  ];
  return (
    <ResourceList queryKey={['warehouse-tasks']} fetcher={warehouseApi.tasks} columns={columns} searchPlaceholder="Search tasks…" emptyTitle="No warehouse tasks" />
  );
}

export default function WarehousePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse" description="Locations, zones, bins, and putaway/pick tasks." crumbs={[{ label: 'Operations' }, { label: 'Warehouse' }]} />
      <Tabs defaultValue="warehouses">
        <TabsList>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="warehouses"><WarehousesTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab /></TabsContent>
      </Tabs>
    </div>
  );
}
