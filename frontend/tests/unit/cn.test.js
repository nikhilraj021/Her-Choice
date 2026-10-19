import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cn } from '../../src/utils/cn.js';

describe('cn', () => {
  it('drops falsy values', () => {
    assert.equal(cn('a', false && 'b', null, 'c'), 'a c');
  });

  it('lets later Tailwind utilities override earlier conflicting ones', () => {
    assert.equal(cn('px-4 py-2', 'px-6'), 'py-2 px-6');
  });
});
