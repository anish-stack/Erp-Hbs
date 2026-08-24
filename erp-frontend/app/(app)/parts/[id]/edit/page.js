'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import PartForm from '@/components/shared/part-form';

import { partsApi } from '@/lib/api/services';


export default function EditPartPage() {
  const params = useParams();

  const id = params.id;


  const {
    data: part,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['part', id],

    queryFn: () =>
      partsApi.get(id),

    enabled: !!id,
  });


  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }


  if (isError || !part) {
    return (
      <div className="p-6">
        Part not found.
      </div>
    );
  }


  return (
    <PartForm
      mode="edit"
      part={part}
    />
  );
}