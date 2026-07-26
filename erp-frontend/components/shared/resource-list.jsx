'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/data-table';
import { ErrorBoundary } from '@/components/shared/error-boundary';

/*
  Drives a standard list screen: owns search + page state, calls the module's
  list service, and feeds DataTable. A full CRUD/list module page becomes ~30
  lines — pass a queryKey, the fetcher, and column config.

  fetcher(params) must return { items, pagination:{ total, page, limit } }.
*/
export function ResourceList({
  queryKey,
  fetcher,
  columns,
  extraParams = {},
  searchPlaceholder,
  onRowClick,
  toolbar,
  emptyTitle,
  emptyDescription,
  limit = 20
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const params = { page, limit, ...(search ? { search } : {}), ...extraParams };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData
  });

  const rows = data?.items || [];
  const pagination = data?.pagination || { total: 0, page, limit };

  return (
    <ErrorBoundary name="Data table">
    <DataTable
      columns={columns}
      rows={rows}
      loading={isLoading || isFetching}
      total={pagination.total}
      page={page}
      limit={limit}
      onPageChange={setPage}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      searchPlaceholder={searchPlaceholder}
      onRowClick={onRowClick}
      toolbar={toolbar}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
    </ErrorBoundary>
  );
}
