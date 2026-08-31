'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');

  /**
   * Debounce search
   *
   * Rules:
   * - Empty => immediately clear search
   * - 1-2 chars => don't call API
   * - 3+ chars => call API after 350ms
   */
  useEffect(() => {
    const trimmed = search.trim();

    const timer = setTimeout(() => {
      if (trimmed === '') {
        setDebouncedSearch('');
        setPage(1);
        return;
      }

      if (trimmed.length >= 3) {
        setDebouncedSearch(trimmed);
        setPage(1);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  /**
   * API params
   */
  const params = useMemo(() => {
    return {
      page,
      limit,
      ...(debouncedSearch
        ? {
            search: debouncedSearch,
          }
        : {}),
      ...extraParams,
    };
  }, [page, limit, debouncedSearch, extraParams]);

  /**
   * React Query
   *
   * IMPORTANT:
   * params is part of queryKey.
   * So when debouncedSearch changes:
   *
   * "abc"
   *    ↓
   * debouncedSearch = "abc"
   *    ↓
   * queryKey changes
   *    ↓
   * fetcher(params)
   */
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