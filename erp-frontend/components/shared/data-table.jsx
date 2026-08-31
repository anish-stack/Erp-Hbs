'use client';

import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

export function DataTable({
  columns,
  rows = [],
  loading = false,
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  onRowClick,
  toolbar,
  emptyTitle,
  emptyDescription,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3">
      {(onSearchChange || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onSearchChange && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}

          {toolbar && (
            <div className="flex items-center gap-2">
              {toolbar}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.align === 'right' && 'text-right',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, ri) => (
                <TableRow
                  key={row.id || ri}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row)
                      : undefined
                  }
                  className={cn(
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === 'right' &&
                          'text-right tabular-nums',
                        col.cellClassName
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : row[col.key] ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {onPageChange && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing{' '}
            <span className="font-medium text-foreground">
              {(page - 1) * limit + 1}
            </span>
            –
            <span className="font-medium text-foreground">
              {Math.min(page * limit, total)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-foreground">
              {total}
            </span>
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            <span className="px-2 tabular-nums">
              {page} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}