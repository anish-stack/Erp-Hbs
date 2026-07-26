'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircuitBoard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/auth-context';
import { apiError } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Signed in');
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      console.log(from)
      router.replace(from && from.startsWith('/') ? from : '/dashboard');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — the console identity, not a stock illustration */}
      <div className="relative hidden flex-col justify-between bg-slate-900 p-10 text-slate-100 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CircuitBoard className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Nexus ERP</span>
        </div>
        <div className="space-y-4">
          <p className="text-2xl font-medium leading-snug">
            Every part, order, and shipment — one console for the whole trading floor.
          </p>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
            <div><p className="text-2xl font-semibold tabular-nums">20</p><p className="text-slate-400">Modules</p></div>
            <div><p className="text-2xl font-semibold tabular-nums">RBAC</p><p className="text-slate-400">Per-role access</p></div>
            <div><p className="text-2xl font-semibold tabular-nums">Live</p><p className="text-slate-400">Event-driven</p></div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Authorised personnel only. Activity is logged.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <CircuitBoard className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">Nexus ERP</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Enter your work email to access the console.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
