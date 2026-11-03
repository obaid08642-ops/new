import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const run = (env) => spawnSync('node', ['tools/payments/check-moyasar-env.mjs'], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
const good = { PAYMENT_PROVIDER: 'moyasar', MOYASAR_API_KEY: 'sk_test_abcdefghijklmnop', MOYASAR_SECRET_KEY: 'sk_test_abcdefghijklmnop', MOYASAR_WEBHOOK_SECRET: 'a-long-webhook-secret', PUBLIC_APP_URL: 'https://nabd.plus', NODE_ENV: 'production' };

let r = run(good);
assert.equal(r.status, 0, r.stdout);
assert.ok(!r.stdout.includes('abcdefghijklmnop') && !r.stdout.includes('a-long-webhook-secret'), 'a value was printed');

// the server today: only the API key
r = run({ MOYASAR_API_KEY: 'sk_test_abcdefghijklmnop', NODE_ENV: 'production' });
assert.equal(r.status, 1);
for (const name of ['PAYMENT_PROVIDER', 'MOYASAR_SECRET_KEY', 'MOYASAR_WEBHOOK_SECRET', 'PAYMENT_RESULT_URL or PUBLIC_APP_URL']) assert.match(r.stdout, new RegExp(`MISSING ${name}`));
assert.ok(!r.stdout.includes('abcdefghijklmnop'), 'a value was printed');

assert.equal(run({ ...good, PUBLIC_APP_URL: 'http://nabd.plus' }).status, 1);
assert.equal(run({ ...good, MOYASAR_API_KEY: 'pending_real_key', MOYASAR_SECRET_KEY: 'pending_real_key' }).status, 1);
console.log('check-moyasar-env: ok');
