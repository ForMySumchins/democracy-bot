import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseListSessions, parseListRepos, parseNew,
  loadFixture,
} from '../src/jules.js';

test('parseListSessions: captures id, repo, status, desc from real CLI table', () => {
  const rows = parseListSessions(loadFixture('list_session.txt'));
  assert.ok(rows.length >= 5, `expected >=5 rows, got ${rows.length}`);
  // first row
  assert.equal(rows[0].id, '422405280211485041');
  assert.match(rows[0].repo, /ForMySumchins\/BzzyAnts/);
  assert.match(rows[0].status, /^Paused$/);
  // a completed row
  const done = rows.find(r => r.status === 'Completed');
  assert.ok(done, 'expected at least one Completed session');
  assert.match(done.repo, /^ForMySumchins\//);
  // status never leaks the "last active" phrase
  assert.ok(!rows.some(r => /ago/.test(r.status)), 'status must not contain "ago"');
});

test('parseListSessions: empty / no-rows returns []', () => {
  assert.deepEqual(parseListSessions('no sessions\n'), []);
});

test('parseListRepos', () => {
  const repos = parseListRepos(loadFixture('list_repo.txt'));
  assert.ok(repos.includes('ForMySumchins/democracy-bot'));
  assert.ok(repos.every(r => r.includes('/')));
});

test('parseNew: extracts session id from "Session created: .../session/<id>"', () => {
  const p = parseNew('Created session.\nSession created: https://jules.google/session/1234567890\n');
  assert.equal(p.id, '1234567890');
  assert.equal(p.url, 'https://jules.google/session/1234567890');
});

test('parseNew: no id -> null', () => {
  const p = parseNew('no match here');
  assert.equal(p.id, null);
});
