'use client';

import { useRouter } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { ResourceList } from '@/components/shared/resource-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { Protected } from '@/components/shared/protected';

import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { partsApi } from '@/lib/api/services';
import { apiError } from '@/lib/api/client';


export default function PartsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => partsApi.remove(id),

    onSuccess: () => {
      toast.success('Part deleted successfully');

      qc.invalidateQueries({
        queryKey: ['parts'],
      });
    },

    onError: (error) => {
      toast.error(apiError(error));
    },
  });


  const handleDelete = (part) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${part.partNumber}"?`
    );

    if (!confirmed) return;

    deleteMutation.mutate(part.id);
  };


  const columns = [
    {
      key: 'partNumber',
      header: 'Part number',
      render: (p) => (
        <span className="font-medium text-slate-900">
          {p.partNumber || '—'}
        </span>
      ),
    },

    {
      key: 'description',
      header: 'Description',
      render: (p) => p.description || '—',
    },

    {
      key: 'manufacturer',
      header: 'Manufacturer',
      render: (p) =>
        p.manufacturer?.name ||
        p.manufacturerName ||
        '—',
    },

    {
      key: 'category',
      header: 'Category',
      render: (p) =>
        p.category?.name ||
        p.categoryName ||
        '—',
    },

    {
      key: 'uom',
      header: 'UOM',
      render: (p) =>
        p.uom?.code ||
        p.uomCode ||
        '—',
    },

    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <StatusBadge
          status={
            p.status ||
            (p.isActive ? 'ACTIVE' : 'INACTIVE')
          }
        />
      ),
    },

    {
      key: 'actions',
      header: 'Actions',
      align: 'right',

      render: (part) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-44"
          >
            <DropdownMenuLabel>
              Actions
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* VIEW */}
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/parts/${part.id}`
                )
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>

            {/* EDIT */}
            <Protected permission="part.update">
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/parts/${part.id}/edit`
                  )
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </Protected>

            <DropdownMenuSeparator />

            {/* DELETE */}
            <Protected permission="part.delete">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => handleDelete(part)}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}

                Delete
              </DropdownMenuItem>
            </Protected>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Parts"
        description="The product catalog every module draws from."
        crumbs={[
          { label: 'Catalog' },
          { label: 'Parts' },
        ]}
        actions={
          <Protected permission="part.create">
            <Button
              onClick={() =>
                router.push('/parts/new')
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New part
            </Button>
          </Protected>
        }
      />

      <ResourceList
        queryKey={['parts']}
        fetcher={partsApi.list}
        columns={columns}
        searchPlaceholder="Search parts…"
        emptyTitle="No parts in the catalog"
      />
    </div>
  );
}