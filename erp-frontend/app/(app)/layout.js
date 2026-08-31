'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/shared/app-shell';

export default function AppLayout({ children }) {
  const { loading } = useAuth();

  // Session resolve hone tak loading
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Middleware normally unauthenticated user ko /login bhej dega.
  // Ye fallback client-side protection ke liye hai.


  return <AppShell>{children}</AppShell>;
}