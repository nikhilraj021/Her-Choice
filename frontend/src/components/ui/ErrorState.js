'use client';

import { Button } from './Button';

/** Used by route-level error.js boundaries. Never shows raw error details to users. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
}) {
  return (
    <div role="alert" className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-600">{description}</p>
      {onRetry && (
        <Button className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
