import { cn } from '@/utils/cn';

/** Shown when a list or page has no data yet (empty cart, no orders, no results) */
export function EmptyState({ title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-neutral-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
