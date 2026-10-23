import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptBlock, chunk4k } from '../src/receipt.js';

test('receiptBlock: contains key fields + link', () => {
  const b = receiptBlock({ id: '9', repo: 'ForMySumchins/x', prompt: 'hello', status: 'dispatched' });
  assert.match(b, /9/);
  assert.match(b, /ForMySumchins\/x/);
  assert.match(b, /https:\/\/jules.google\/session\/9/);
  assert.match(b, /dispatched/);
});

test('chunk4k: splits long content under 4000 each', () => {
  const long = 'x'.repeat(9000);
  const parts = chunk4k(long);
  assert.ok(parts.length >= 3);
  assert.ok(parts.every(p => p.length <= 4000));
  assert.equal(parts.join('').length, long.length);
});
