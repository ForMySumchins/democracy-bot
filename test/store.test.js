import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.js';

test('Store: add/get/set/all roundtrip', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dumbass-test-'));
  const file = join(dir, 'x.json');
  const s = new Store(file);
  s.add({ id: 'a', repo: 'o/r', prompt: 'p', status: 'dispatched', createdAt: Date.now() });
  s.add({ id: 'b', repo: 'o/r2', prompt: 'q', status: 'dispatched', createdAt: Date.now() });
  assert.equal(s.get('a').repo, 'o/r');
  s.set('a', { status: 'Completed' });
  assert.equal(s.get('a').status, 'Completed');
  assert.equal(s.all().length, 2);
  // persistence
  const s2 = new Store(file);
  assert.equal(s2.get('a').status, 'Completed');
  rmSync(dir, { recursive: true, force: true });
});

test('Store: corrupt file resets cleanly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dumbass-test-'));
  const file = join(dir, 'x.json');
  writeFileSync(file, 'not json{{{');
  const s = new Store(file);
  assert.deepEqual(s.all(), []);
  rmSync(dir, { recursive: true, force: true });
});
