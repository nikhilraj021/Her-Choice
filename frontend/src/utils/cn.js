import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins conditional class names and resolves conflicting Tailwind utilities,
 * so a caller's `className="px-6"` correctly overrides a component's default `px-4`.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
