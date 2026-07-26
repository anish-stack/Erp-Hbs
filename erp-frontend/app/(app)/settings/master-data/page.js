'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { masterApi } from '@/lib/api/services';
import { apiError } from '@/lib/api/client';

/*
  A single generic CRUD table + create dialog, reused across four small master
  lists (manufacturers, categories, UOMs, tax rates). Keeps this file from
  turning into four near-identical copies.
*/
function MasterTable({ queryKey, listFn, createFn, removeFn, fields, permissionPrefix }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const empty = Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
  const [form, setForm] = useState(empty);

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: () => listFn({ limit: 100 }) });
  const items = data?.items || [];

  const createMutation = useMutation({
    mutationFn: () => createFn(form),
    onSuccess: () => { toast.success('Created'); qc.invalidateQueries({ queryKey: [queryKey] }); setCreateOpen(false); setForm(empty); },
    onError: (e) => toast.error(apiError(e))
  });

  const removeMutation = useMutation({
    mutationFn: (id) => removeFn(id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: [queryKey] }); setRemoveTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setRemoveTarget(null); }
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Protected permission={`${permissionPrefix}.create`}>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add</Button>
        </Protected>
      </div>
      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50">
            <tr>
              {fields.map((f) => <th key={f.key} className="px-4 py-2.5 text-left font-medium text-slate-600">{f.label}</th>)}
              <th className="px-4 py-2.5 text-right font-medium text-slate-600 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={fields.length + 1} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={fields.length + 1} className="px-4 py-8 text-center text-muted-foreground">Nothing here yet.</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                {fields.map((f) => (
                  <td key={f.key} className="px-4 py-2.5">
                    {f.key === 'isActive' ? <StatusBadge status={item.isActive === false ? 'INACTIVE' : 'ACTIVE'} /> : (item[f.key] ?? '—')}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  {removeFn && (
                    <Protected permission={`${permissionPrefix}.delete`}>
                      <Button variant="ghost" size="icon" onClick={() => setRemoveTarget(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </Protected>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add entry</DialogTitle><DialogDescription>Added entries are available across the catalog immediately.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-2">
            {fields.filter((f) => f.editable !== false).map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {removeFn && (
        <ConfirmDialog
          open={!!removeTarget}
          onOpenChange={(o) => !o && setRemoveTarget(null)}
          title={removeTarget ? `Remove ${removeTarget.name || removeTarget.code}?` : ''}
          description="This cannot be undone. Existing records referencing it are unaffected."
          confirmLabel="Remove"
          destructive
          loading={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(removeTarget.id)}
        />
      )}
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Master data" description="Manufacturers, categories, units of measure, and tax rates used across the catalog." crumbs={[{ label: 'Settings' }, { label: 'Master data' }]} />
      <Tabs defaultValue="manufacturers">
        <TabsList>
          <TabsTrigger value="manufacturers">Manufacturers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="uoms">UOMs</TabsTrigger>
          <TabsTrigger value="tax-rates">Tax rates</TabsTrigger>
        </TabsList>
        <TabsContent value="manufacturers">
          <MasterTable
            queryKey="manufacturers"
            listFn={masterApi.manufacturers}
            createFn={masterApi.createManufacturer}
            removeFn={masterApi.removeManufacturer}
            permissionPrefix="manufacturer"
            fields={[{ key: 'code', label: 'Code', placeholder: 'TI' }, { key: 'name', label: 'Name', placeholder: 'Texas Instruments' }, { key: 'country', label: 'Country' }]}
          />
        </TabsContent>
        <TabsContent value="categories">
          <MasterTable
            queryKey="categories"
            listFn={masterApi.categories}
            createFn={masterApi.createCategory}
            removeFn={masterApi.removeCategory}
            permissionPrefix="category"
            fields={[{ key: 'code', label: 'Code', placeholder: 'IC-AMP' }, { key: 'name', label: 'Name', placeholder: 'Amplifiers' }]}
          />
        </TabsContent>
        <TabsContent value="uoms">
          <MasterTable
            queryKey="uoms"
            listFn={masterApi.uoms}
            createFn={masterApi.createUom}
            removeFn={null}
            permissionPrefix="setting"
            fields={[{ key: 'code', label: 'Code', placeholder: 'PCS' }, { key: 'name', label: 'Name', placeholder: 'Pieces' }]}
          />
        </TabsContent>
        <TabsContent value="tax-rates">
          <MasterTable
            queryKey="tax-rates"
            listFn={masterApi.taxRates}
            createFn={masterApi.createTaxRate}
            removeFn={null}
            permissionPrefix="setting"
            fields={[{ key: 'code', label: 'Code', placeholder: 'GST18' }, { key: 'name', label: 'Name', placeholder: 'GST 18%' }, { key: 'ratePct', label: 'Rate %', placeholder: '18', default: 0 }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
