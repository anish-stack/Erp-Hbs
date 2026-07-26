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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { usersApi } from '@/lib/api/services';
import { initials, formatDate } from '@/lib/utils';
import { apiError } from '@/lib/api/client';

function CreateUserDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

  const mutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      setForm({ name: '', email: '', phone: '', password: '' });
    },
    onError: (e) => toast.error(apiError(e))
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>Create a staff account. They&apos;ll receive access based on their assigned role.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2"><Label>Full name</Label><Input value={form.name} onChange={set('name')} placeholder="Priya Sharma" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={set('email')} placeholder="priya@company.com" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} placeholder="+91…" /></div>
          </div>
          <div className="space-y-2"><Label>Temporary password</Label><Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.email || !form.name}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const columns = [
    {
      key: 'name', header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8"><AvatarFallback>{initials(u.name || u.email)}</AvatarFallback></Avatar>
          <div className="leading-tight">
            <p className="font-medium text-slate-900">{u.name || '—'}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      )
    },
    { key: 'role', header: 'Role', render: (u) => <span className="capitalize">{u.role?.name || u.role || '—'}</span> },
    { key: 'department', header: 'Department', render: (u) => u.department?.name || u.departmentName || '—' },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status || (u.isActive ? 'ACTIVE' : 'INACTIVE')} /> },
    { key: 'createdAt', header: 'Joined', align: 'right', render: (u) => formatDate(u.createdAt) }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Staff accounts and their access."
        crumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        actions={
          <Protected permission="user.create">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New user</Button>
          </Protected>
        }
      />
      <ResourceList
        queryKey={['users']}
        fetcher={usersApi.list}
        columns={columns}
        searchPlaceholder="Search by name or email…"
        emptyTitle="No users found"
        emptyDescription="Create the first staff account to get started."
      />
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
