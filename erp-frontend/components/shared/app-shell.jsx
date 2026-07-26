'use client';

import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export function AppShell({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {/* Catches a crash inside the page content and shows which area failed,
                without taking down the sidebar/topbar around it. */}
            <ErrorBoundary name="Page content">{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
