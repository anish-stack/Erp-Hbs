'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Loader2, ShieldCheck, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Protected } from '@/components/shared/protected';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { rolesApi } from '@/lib/api/services';
import { apiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function CreateRoleDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const empty = { code: '', name: '', description: '' };
  const [form, setForm] = useState(empty);

  const mutation = useMutation({
    mutationFn: () => rolesApi.create(form),
    onSuccess: () => { toast.success('Role created'); qc.invalidateQueries({ queryKey: ['roles'] }); onOpenChange(false); setForm(empty); },
    onError: (e) => toast.error(apiError(e))
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New role</DialogTitle><DialogDescription>Create a role, then assign permissions from the matrix.</DialogDescription></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={set('code')} placeholder="warehouse_manager" /></div>
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={set('name')} placeholder="Warehouse Manager" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={set('description')} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.code || !form.name}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionMatrix({ role, onBack }) {
  const qc = useQueryClient();
  const { data: matrixData, isLoading: matrixLoading } = useQuery({ queryKey: ['permission-matrix'], queryFn: () => rolesApi.permissionModules() });
  const { data: roleData, isLoading: roleLoading } = useQuery({ queryKey: ['role-permissions', role.id], queryFn: () => rolesApi.permissions(role.id) });

  const [selected, setSelected] = useState(null);
  const codes = selected ?? roleData?.permissions ?? [];
  const modules = matrixData?.modules || [];

  const save = useMutation({
    mutationFn: () => rolesApi.setPermissions(role.id, selected ?? codes),
    onSuccess: () => { toast.success('Permissions saved'); qc.invalidateQueries({ queryKey: ['role-permissions', role.id] }); },
    onError: (e) => toast.error(apiError(e))
  });

  const toggle = (code) => {
    const base = selected ?? roleData?.permissions ?? [];
    setSelected(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };
  const toggleModule = (moduleActions, allOn) => {
    const base = selected ?? roleData?.permissions ?? [];
    const moduleCodes = moduleActions.map((a) => a.code);
    setSelected(allOn ? base.filter((c) => !moduleCodes.includes(c)) : Array.from(new Set([...base, ...moduleCodes])));
  };

  if (matrixLoading || roleLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Loading permissions…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4" /> All roles</Button>
        <Protected permission="role.update">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || selected === null}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save permissions
          </Button>
        </Protected>
      </div>
      <div className="rounded-lg border border-border p-4">
        <p className="mb-1 font-medium text-slate-900">{role.name}</p>
        <p className="text-xs text-muted-foreground">{role.description || 'No description'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((m) => {
          const moduleCodes = m.actions.map((a) => a.code);
          const allOn = moduleCodes.every((c) => codes.includes(c));
          return (
            <div key={m.module} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold capitalize text-slate-900">{m.label || m.module}</p>
                <button type="button" onClick={() => toggleModule(m.actions, allOn)} className="text-xs text-primary hover:underline">
                  {allOn ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-1.5">
                {m.actions.map((a) => (
                  <label key={a.code} className="flex items-center gap-2 text-sm text-slate-700">
                    <Checkbox checked={codes.includes(a.code)} onCheckedChange={() => toggle(a.code)} />
                    <span className="capitalize">{a.action}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list({ limit: 100 }) });
  const roles = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Define roles and control what each one can see and do."
        crumbs={[{ label: 'Settings' }, { label: 'Roles' }]}
        actions={!activeRole && (
          <Protected permission="role.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New role</Button>
          </Protected>
        )}
      />
      {activeRole ? (
        <PermissionMatrix role={activeRole} onBack={() => setActiveRole(null)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading roles…</p>}
          {!isLoading && roles.length === 0 && <p className="text-sm text-muted-foreground">No roles yet.</p>}
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r)}
              className={cn('flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition hover:border-primary hover:shadow-sm')}
            >
              <div className="flex w-full items-center justify-between">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <StatusBadge status={r.isActive === false ? 'INACTIVE' : 'ACTIVE'} />
              </div>
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.description || r.code}</p>
            </button>
          ))}
        </div>
      )}
      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
