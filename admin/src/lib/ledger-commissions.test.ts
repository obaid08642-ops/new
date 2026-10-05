// Q5: /admin/financial-ledger reads GET /admin/finance/ledger/commissions
// (backend web-core finance.controller.ts getCommissions -> { data: CommissionLedger[] }).
// Rows are mongoose documents: _id, providerName, providerType, baseBill,
// systemCommission, vatOnCommission, providerEarning (commission-ledger.schema.ts).
// Run: node_modules/.bin/jiti src/lib/ledger-commissions.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMISSIONS_LEDGER_PATH, commissionRate, loadCommissionLedger, parseCommissionLedger } from './ledger-commissions';

const ROW = {
  _id: '66f0c0ffee0000000000abcd',
  providerId: '66f0c0ffee0000000000aaaa',
  providerName: 'صيدلية النهدي',
  providerType: 'pharmacy',
  baseBill: 200,
  systemCommission: 10,
  vatOnCommission: 1.5,
  providerEarning: 190,
  createdAt: '2026-10-01T10:00:00.000Z',
};

test('calls the moved R36 ledger route that the backend serves', () => {
  assert.equal(COMMISSIONS_LEDGER_PATH, '/api/admin/admin/finance/ledger/commissions');
  const controller = readFileSync(join(__dirname, '..', '..', '..', 'backend', 'src', 'modules', 'admin', 'web-core', 'controllers', 'finance.controller.ts'), 'utf8');
  assert.ok(controller.includes("@Controller('admin/finance')"));
  assert.ok(controller.includes("@Get('ledger/commissions')"));
});

test('maps the stored ledger fields (no client-side recomputation, real type and id)', () => {
  assert.deepEqual(parseCommissionLedger({ data: [ROW] }), [{
    id: '66f0c0ffee0000000000abcd',
    providerName: 'صيدلية النهدي',
    providerType: 'pharmacy',
    baseBill: 200,
    systemCommission: 10,
    vatOnCommission: 1.5,
    providerEarning: 190,
  }]);
  assert.equal(commissionRate({ baseBill: 200, systemCommission: 10 }), 5);
  assert.equal(commissionRate({ baseBill: 0, systemCommission: 0 }), null);
});

test('drops malformed rows and tolerates a bare array or a bad payload', () => {
  assert.deepEqual(parseCommissionLedger({ data: [{ providerName: 'x' }, null, 'y'] }), []);
  assert.equal(parseCommissionLedger([ROW]).length, 1);
  assert.deepEqual(parseCommissionLedger(null), []);
});

test('load states: ready with rows, empty, and error on a failed response', async () => {
  const ok = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200 });
  assert.deepEqual((await loadCommissionLedger(ok({ data: [ROW] }))).status, 'ready');
  assert.deepEqual(await loadCommissionLedger(ok({ data: [] })), { status: 'empty', rows: [] });
  assert.deepEqual(await loadCommissionLedger(async () => new Response('{"code":"invalid_date_range"}', { status: 400 })), { status: 'error', rows: [] });
  assert.deepEqual(await loadCommissionLedger(async () => { throw new Error('offline'); }), { status: 'error', rows: [] });
});
