import { cn } from '@/utils/cn';

/**
 * Labelled text input that displays a validation message.
 * Works with React Hook Form: <Input label="Email" error={errors.email?.message} {...register('email')} />
 */
export function Input({ label, error, hint, id, name, className, ...props }) {
  const inputId = id ?? name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-800">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'block h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none transition-colors',
          'placeholder:text-neutral-400 focus:ring-2',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-neutral-300 focus:border-brand-500 focus:ring-brand-100',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-sm text-neutral-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
