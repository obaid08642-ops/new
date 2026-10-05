// Admin list normaliser (disputes / orders / gdpr). Run: node_modules/.bin/jiti src/lib/paged-list.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePagedList, normalizeStatusCounts } from './paged-list';

type Row = { id: string };

test('passes a well-formed paged response through', () => {
  const out = normalizePagedList<Row>({ data: [{ id: 'a' }, { id: 'b' }], total: 42, page: 2, pages: 3 }, 2);
  assert.deepEqual(out, { data: [{ id: 'a' }, { id: 'b' }], total: 42, page: 2, pages: 3 });
});

test('accepts a bare array (legacy routes)', () => {
  assert.deepEqual(normalizePagedList<Row>([{ id: 'a' }], 1), { data: [{ id: 'a' }], total: 1, page: 1, pages: 1 });
});

test('malformed payloads render as an empty list, never throw', () => {
  for (const bad of [null, undefined, 'Internal Server Error', 42, { message: 'boom' }, { data: 'nope' }, { data: null }]) {
    assert.deepEqual(normalizePagedList<Row>(bad, 3), { data: [], total: 0, page: 3, pages: 1 }, JSON.stringify(bad));
  }
});

test('null / scalar rows are dropped so the table never reads row.id of null', () => {
  const out = normalizePagedList<Row>({ data: [null, 'x', 7, [], { id: 'ok' }], total: 5 }, 1);
  assert.deepEqual(out.data, [{ id: 'ok' }]);
  assert.equal(out.total, 5);
});

test('non-numeric or negative counters fall back to safe defaults', () => {
  const out = normalizePagedList<Row>({ data: [{ id: 'a' }], total: 'many', page: -2, pages: 'NaN' }, 4);
  assert.deepEqual(out, { data: [{ id: 'a' }], total: 1, page: 4, pages: 1 });
  assert.deepEqual(normalizePagedList<Row>({ data: [], total: '17', page: '2', pages: '5' }, 1), { data: [], total: 17, page: 2, pages: 5 });
});

test('status counts keep numeric entries only', () => {
  assert.deepEqual(normalizeStatusCounts({ requested: 3, processing: '2', completed: null, bad: 'x' }), { requested: 3, processing: 2 });
  assert.deepEqual(normalizeStatusCounts(null), {});
  assert.deepEqual(normalizeStatusCounts(['requested']), {});
});
