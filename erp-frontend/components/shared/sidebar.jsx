'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { NAV_GROUPS } from '@/lib/constants/nav';
import { useCan } from '@/lib/auth/use-permissions';
import { cn } from '@/lib/utils';

function Brand() {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icons.CircuitBoard className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-slate-900">Nexus ERP</p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Components trading</p>
      </div>
    </div>
  );
}

export function SidebarNav({ onNavigate }) {
  const pathname = usePathname();
  const { can } = useCan();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => can(item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
            {items.map((item) => {
              const Icon = Icons[item.icon] || Icons.Dot;
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href} data-active={active} className="nav-item" onClick={onNavigate}>
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-slate-400')} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <Brand />
      <SidebarNav />
      <div className="border-t border-border px-5 py-3">
        <p className="text-[11px] text-muted-foreground">v1.0 · 20 modules online</p>
      </div>
    </aside>
  );
}

export { Brand };
