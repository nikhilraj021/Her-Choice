'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import './globals.css';

// Last-resort boundary for errors thrown in the root layout. It replaces the whole document.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans">
        <ErrorState onRetry={reset} />
      </body>
    </html>
  );
}
