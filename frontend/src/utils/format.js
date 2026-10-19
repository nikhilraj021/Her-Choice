const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

/**
 * Formats an amount for display only. The API sends money as decimal strings
 * (e.g. "1499.00") and remains the source of truth for every calculation.
 */
export function formatCurrency(amount) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return currencyFormatter.format(value);
}

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date);
}
