import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FileQuestion className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
          <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        </div>
        <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
