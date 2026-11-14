#!/usr/bin/env node
// #551: records live Moyasar SANDBOX responses for backend/test/fixtures/moyasar. Run it by hand, on a machine whose
// environment already holds the sandbox secret key; never commit the output as is (replace ids and secrets first).
//   MOYASAR_API_KEY=sk_test_... node tools/payments/record-moyasar-sandbox.mjs ./recorded
// It creates one invoice and reads it back. Paying and refunding need the hosted page / dashboard (test cards:
// https://docs.moyasar.com/guides/card-payment/test-cards), after which `--invoice <id> --refund` records the refund.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const key = process.env.MOYASAR_API_KEY;
if (!key || !key.startsWith('sk_test_')) { console.error('MOYASAR_API_KEY must be a sandbox (sk_test_) key in the environment'); process.exit(2); }
const base = (process.env.MOYASAR_API_BASE || 'https://api.moyasar.com/v1').replace(/\/+$/, '');
const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--') && a !== args[args.indexOf('--invoice') + 1]) || './recorded';
const invoiceId = args.includes('--invoice') ? args[args.indexOf('--invoice') + 1] : undefined;
const auth = { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' };
mkdirSync(out, { recursive: true });
const save = (name, body) => { writeFileSync(join(out, name), JSON.stringify(body, null, 2) + '\n'); console.log('wrote', name); };
const call = async (path, init) => (await fetch(`${base}${path}`, { headers: auth, ...init })).json();

if (!invoiceId) {
  const inv = await call('/invoices', { method: 'POST', body: JSON.stringify({ amount: 15000, currency: 'SAR', description: 'Nabd sandbox recording', callback_url: 'https://example.com/payments/result' }) });
  save('invoice-created.json', inv);
  console.log('open', inv.url, 'and pay with a sandbox test card, then re-run with --invoice', inv.id);
} else {
  const inv = await call(`/invoices/${invoiceId}`);
  save('invoice-read.json', inv);
  const paid = (inv.payments || []).find((p) => p.status === 'paid');
  if (paid && args.includes('--refund')) save('payment-refunded.json', await call(`/payments/${paid.id}/refund`, { method: 'POST', body: '{}' }));
}
