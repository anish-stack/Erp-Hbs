'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shared/error-state';

export default function RootError({ error, reset }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app/error.js]', error);
  }, [error]);

  return <ErrorState title="Something went wrong" where="Application" error={error} reset={reset} />;
}
