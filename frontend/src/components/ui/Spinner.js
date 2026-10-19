import { cn } from '@/utils/cn';

const sizes = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-10 border-[3px]' };

export function Spinner({ size = 'md', className, label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent',
        sizes[size],
        className,
      )}
    />
  );
}

/** Centered spinner used by route-level loading.js files */
export function PageSpinner({ label }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-brand-600">
      <Spinner size="lg" label={label} />
    </div>
  );
}
