'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { NAV_GROUPS } from '@/lib/constants/nav';
import { useCan } from '@/lib/auth/use-permissions';

/*
  ⌘K / Ctrl-K global navigator. Jumps to any module the user can access —
  the operations-console signature of the app.
*/
export function CommandMenu({ open, setOpen }) {
  const router = useRouter();
  const { can } = useCan();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const go = (href) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a module or search…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => can(i.permission));
          if (!items.length) return null;
          return (
            <CommandGroup key={group.label} heading={group.label}>
              {items.map((item) => {
                const Icon = Icons[item.icon] || Icons.Dot;
                return (
                  <CommandItem key={item.href} value={`${group.label} ${item.title}`} onSelect={() => go(item.href)}>
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.title}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
