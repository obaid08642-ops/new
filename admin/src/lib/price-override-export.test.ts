// Q25. Run: node_modules/.bin/jiti src/lib/price-override-export.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchPriceOverridesCsv } from './price-override-export';

test('the export downloads the server CSV through the admin BFF with the given filters', async () => {
  const calls: Array<{ url: string; accept: string | null }> = [];
  const csv = '﻿changed_at,pharmacy_account_id,order_id\r\n"2026-10-01T00:00:00.000Z","ph-1","o-1"';
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), accept: new Headers(init?.headers).get('accept') });
    return new Response(csv, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8' } });
  }) as typeof fetch;
  try {
    const out = await fetchPriceOverridesCsv({ pharmacy_account_id: 'ph-1', from: '2026-10-01' });
    assert.deepEqual(calls, [{ url: '/api/admin/admin/pharmacy/price-overrides.csv?pharmacy_account_id=ph-1&from=2026-10-01', accept: 'text/csv' }]);
    assert.match(out.csv, /"ph-1","o-1"/);
    assert.match(out.filename, /^price-overrides-\d{4}-\d{2}-\d{2}\.csv$/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a failed export surfaces the server error instead of saving a file', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: 'Insufficient role' }), { status: 403, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  try {
    await assert.rejects(fetchPriceOverridesCsv(), (err: unknown) => (err as { status?: number }).status === 403);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the price-override audit page has an export button wired to the server CSV', () => {
  const page = readFileSync(join(__dirname, '../pages/admin/price-override-audit.tsx'), 'utf8');
  assert.match(page, /fetchPriceOverridesCsv\(\)/);
  assert.match(page, /onClick=\{\(\) => void exportCsv\(\)\}/);
});
