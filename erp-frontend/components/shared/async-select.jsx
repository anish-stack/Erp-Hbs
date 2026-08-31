'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

/*
  Searchable combobox backed by a server fetcher. Used anywhere a form needs
  to pick a part/customer/supplier/warehouse by id without loading everything
  up front.

  fetcher(query) => Promise<Array<{ id, label, sub? }>>
  Pass a static `options` array instead of `fetcher` for small fixed lists.
*/
export function AsyncSelect({ value, onChange, fetcher, options, placeholder = 'Select…', searchPlaceholder = 'Search…', disabled, defaultLabel = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(options || []);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel);   // init from prop

  useEffect(() => {
    setSelectedLabel(defaultLabel);   // parent label change pe sync
  }, [defaultLabel]);

  useEffect(() => {
    if (!fetcher || !open) return;
    let active = true;
    setLoading(true);
    fetcher(query)
      .then((res) => { if (active) setItems(res || []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, open, fetcher]);

  useEffect(() => {
    if (options) setItems(options);
  }, [options]);

  useEffect(() => {
    const match = items.find((i) => i.id === value);
    if (match) setSelectedLabel(match.label);
  }, [value, items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate">{value ? selectedLabel || 'Selected' : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={!fetcher}>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : (
              <>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => { onChange(item.id, item); setSelectedLabel(item.label); setOpen(false); }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} />
                      <div className="leading-tight">
                        <p>{item.label}</p>
                        {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
