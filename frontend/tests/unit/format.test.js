import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCurrency, formatDate } from '../../src/utils/format.js';

describe('formatCurrency', () => {
  it('formats decimal strings from the API as INR', () => {
    assert.equal(formatCurrency('1499.00'), '₹1,499.00');
  });

  it('uses Indian digit grouping', () => {
    assert.equal(formatCurrency(1234567.5), '₹12,34,567.50');
  });

  it('returns an empty string for missing or invalid amounts', () => {
    assert.equal(formatCurrency(null), '');
    assert.equal(formatCurrency('abc'), '');
  });
});

describe('formatDate', () => {
  it('formats ISO strings', () => {
    assert.equal(formatDate('2026-10-19T07:06:04.683Z'), '19 Oct 2026');
  });

  it('returns an empty string for invalid dates', () => {
    assert.equal(formatDate('not-a-date'), '');
  });
});
