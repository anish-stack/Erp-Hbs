'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { partsApi, masterApi } from '@/lib/api/services';
import { apiError } from '@/lib/api/client';

function CreatePartDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { partNumber: '', description: '', manufacturerId: '', categoryId: '', uomId: '', hsnCode: '' };
  const [form, setForm] = useState(empty);

  const { data: manufacturers = [] } = useQuery({ queryKey: ['manufacturers', 'options'], queryFn: () => masterApi.manufacturers({ limit: 100 }), enabled: open });
  const { data: categories = [] } = useQuery({ queryKey: ['categories', 'options'], queryFn: () => masterApi.categories({ limit: 100 }), enabled: open });
  const { data: uoms = [] } = useQuery({ queryKey: ['uoms', 'options'], queryFn: () => masterApi.uoms(), enabled: open });

  const mutation = useMutation({
    mutationFn: () => partsApi.create(form),
    onSuccess: () => {
      toast.success('Part added to catalog');
      qc.invalidateQueries({ queryKey: ['parts'] });
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
          <DialogTitle>New part</DialogTitle>
          <DialogDescription>Add a component to the catalog every module draws from.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Part number</Label><Input value={form.partNumber} onChange={set('partNumber')} placeholder="LM358N" /></div>
            <div className="space-y-2"><Label>HSN code</Label><Input value={form.hsnCode} onChange={set('hsnCode')} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={set('description')} rows={2} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Select value={form.manufacturerId} onValueChange={set('manufacturerId')}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(manufacturers.items || manufacturers).map?.((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={set('categoryId')}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(categories.items || categories).map?.((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UOM</Label>
              <Select value={form.uomId} onValueChange={set('uomId')}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(uoms.items || uoms).map?.((u) => <SelectItem key={u.id} value={u.id}>{u.code || u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.partNumber || !form.description || !form.manufacturerId || !form.categoryId || !form.uomId}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create part
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PartsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const columns = [
    { key: 'code', header: 'Part code', render: (p) => <span className="font-medium text-slate-900">{p.code || p.partCode}</span> },
    { key: 'name', header: 'Description', render: (p) => p.name || p.description || '—' },
    { key: 'manufacturer', header: 'Manufacturer', render: (p) => p.manufacturer?.name || p.manufacturerName || '—' },
    { key: 'category', header: 'Category', render: (p) => p.category?.name || p.categoryName || '—' },
    { key: 'uom', header: 'UOM', render: (p) => p.uom?.code || p.uomCode || '—' },
    { key: 'status', header: 'Status', align: 'right', render: (p) => <StatusBadge status={p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE')} /> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parts"
        description="The product catalog every module draws from."
        crumbs={[{ label: 'Catalog' }, { label: 'Parts' }]}
        actions={
          <Protected permission="part.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New part</Button>
          </Protected>
        }
      />
      <ResourceList queryKey={['parts']} fetcher={partsApi.list} columns={columns} searchPlaceholder="Search parts…" emptyTitle="No parts in the catalog" />
      <CreatePartDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
