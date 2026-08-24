'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/data-table';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export function ResourceList({
  queryKey,
  fetcher,
  columns,
  extraParams = {},
  searchPlaceholder = 'Search records...',
  onRowClick,
  toolbar,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records to display.',
  limit = 20,
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const params = {
    page,
    limit,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...extraParams,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.items || [];

  const pagination = data?.pagination || {
    total: 0,
    page,
    limit,
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  return (
    <ErrorBoundary name="Data table">
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        fetching={isFetching}
        error={isError}
        onRetry={refetch}
        total={pagination.total}
        page={pagination.page || page}
        limit={pagination.limit || limit}
        onPageChange={handlePageChange}
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={searchPlaceholder}
        onRowClick={onRowClick}
        toolbar={toolbar}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </ErrorBoundary>
  );
}