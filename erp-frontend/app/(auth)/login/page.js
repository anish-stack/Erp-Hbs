'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircuitBoard,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Activity,
  Boxes,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/auth-context';
import { apiError } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@erp.local');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      await login({ email, password });

      toast.success('Welcome back!', {
        description: 'You have successfully signed in.',
      });

      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');

      router.replace(
        from && from.startsWith('/') ? from : '/dashboard'
      );
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-50">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Soft gradient blobs */}
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-100/70 blur-3xl" />

        <div className="absolute -bottom-48 -right-40 h-[600px] w-[600px] rounded-full bg-blue-100/60 blur-3xl" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">

        {/* =====================================================
            LEFT BRAND PANEL
        ====================================================== */}

        <section className="relative hidden overflow-hidden border-r border-slate-200 bg-white lg:flex">

          {/* Decorative circles */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-indigo-100" />

          <div className="absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full border border-blue-100" />

          {/* Circuit decorations */}
          <div className="absolute left-[15%] top-[22%] h-px w-44 bg-gradient-to-r from-indigo-300 to-transparent" />

          <div className="absolute left-[15%] top-[22%] h-28 w-px bg-gradient-to-b from-indigo-300 to-transparent" />

          <div className="absolute left-[15%] top-[22%] h-2 w-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-300" />

          <div className="absolute bottom-[28%] right-[14%] h-px w-52 bg-gradient-to-l from-blue-300 to-transparent" />

          <div className="absolute bottom-[28%] right-[14%] h-28 w-px bg-gradient-to-t from-blue-300 to-transparent" />

          <div className="absolute bottom-[28%] right-[14%] h-2 w-2 rounded-full bg-blue-500 shadow-lg shadow-blue-300" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            {/* Logo */}
            <div className="flex items-center gap-3">

              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
                <CircuitBoard className="h-6 w-6 text-white" />

                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
              </div>

              <div>
                <p className="text-lg font-bold tracking-tight text-slate-900">
                  The Chips Vally
                </p>

                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
                  Enterprise ERP
                </p>
              </div>

            </div>

            {/* Main content */}
            <div className="max-w-xl">

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                <Sparkles className="h-3.5 w-3.5" />
                Intelligent Trading Operations
              </div>

              <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-slate-900 xl:text-6xl">
                Everything your
                <span className="block bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  trading business needs.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-500">
                Manage parts, customers, suppliers, inventory, orders,
                shipments and your complete trading workflow from one
                powerful ERP platform.
              </p>

              {/* Stats */}
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

                  <Boxes className="mb-3 h-5 w-5 text-indigo-600" />

                  <p className="text-xl font-bold text-slate-900">
                    20+
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Modules
                  </p>

                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

                  <ShieldCheck className="mb-3 h-5 w-5 text-emerald-600" />

                  <p className="text-xl font-bold text-slate-900">
                    RBAC
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Role access
                  </p>

                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

                  <Activity className="mb-3 h-5 w-5 text-blue-600" />

                  <p className="text-xl font-bold text-slate-900">
                    Live
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Event driven
                  </p>

                </div>

              </div>

              {/* Trust indicators */}
              <div className="mt-8 flex flex-wrap gap-5">

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Secure access
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Activity logging
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Real-time operations
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-6">

              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} The Chips Vally
              </p>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </div>

            </div>

          </div>
        </section>

        {/* =====================================================
            RIGHT LOGIN
        ====================================================== */}

        <section className="relative flex items-center justify-center px-5 py-10 sm:px-8">

          {/* Mobile logo */}
          <div className="absolute left-0 right-0 top-8 flex justify-center lg:hidden">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
                <CircuitBoard className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  The Chips Vally
                </p>

                <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
                  Enterprise ERP
                </p>
              </div>

            </div>

          </div>

          <div className="relative z-10 w-full max-w-md pt-20 lg:pt-0">

            {/* Login Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">

              {/* Header */}
              <div className="mb-8">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
                  <ShieldCheck className="h-6 w-6 text-indigo-600" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue to your trading operations console.
                </p>

              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-5">

                {/* Email */}
                <div className="space-y-2">

                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Work email
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                  />

                </div>

                {/* Password */}
                <div className="space-y-2">

                  <div className="flex items-center justify-between">

                    <Label
                      htmlFor="password"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Password
                    </Label>

                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                      onClick={() =>
                        toast.info('Please contact your administrator.')
                      }
                    >
                      Forgot password?
                    </button>

                  </div>

                  <div className="relative">

                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                  </div>

                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="group h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to console
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>

              </form>

              {/* Security */}
              <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secure access · Activity is monitored and logged
              </div>

            </div>

            {/* Bottom */}
            <p className="mt-6 text-center text-xs text-slate-400">
              Authorised personnel only.
              <span className="mx-1.5">•</span>
              Contact your administrator for access.
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}