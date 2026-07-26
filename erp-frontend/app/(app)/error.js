'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ErrorState } from '@/components/shared/error-state';

export default function AppError({ error, reset }) {
  const pathname = usePathname();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(`[app segment error @ ${pathname}]`, error);
  }, [error, pathname]);

  // `where` shows the exact route segment that failed, e.g. "/sales/orders"
  return <ErrorState title="This screen hit an error" where={pathname} error={error} reset={reset} />;
}
