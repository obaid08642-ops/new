import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Fixtures are built at run time from parts, so no key-shaped literal sits in the repository (secret scanners read the files).
const fakeKey = (kind) => ['sk', kind, 'x'.repeat(20)].join('_');
const fakeWebhook = ['hook', 'y'.repeat(24)].join('-');
const run = (env) => spawnSync('node', ['tools/payments/check-moyasar-env.mjs'], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
const good = { PAYMENT_PROVIDER: 'moyasar', MOYASAR_API_KEY: fakeKey('test'), MOYASAR_SECRET_KEY: fakeKey('test'), MOYASAR_WEBHOOK_SECRET: fakeWebhook, PUBLIC_APP_URL: 'https://nabd.plus', NODE_ENV: 'production' };
const leaks = (out) => out.includes('x'.repeat(8)) || out.includes('y'.repeat(8));

let r = run(good);
assert.equal(r.status, 0, r.stdout);
assert.ok(!leaks(r.stdout), 'a value was printed');

// the server today: only the API key
r = run({ MOYASAR_API_KEY: fakeKey('test'), NODE_ENV: 'production' });
assert.equal(r.status, 1);
for (const name of ['PAYMENT_PROVIDER', 'MOYASAR_SECRET_KEY', 'MOYASAR_WEBHOOK_SECRET', 'PAYMENT_RESULT_URL or PUBLIC_APP_URL']) assert.match(r.stdout, new RegExp(`MISSING ${name}`));
assert.ok(!leaks(r.stdout), 'a value was printed');

assert.equal(run({ ...good, PUBLIC_APP_URL: 'http://nabd.plus' }).status, 1);
assert.equal(run({ ...good, MOYASAR_API_KEY: 'placeholder', MOYASAR_SECRET_KEY: 'placeholder' }).status, 1);
assert.equal(run({ ...good, MOYASAR_SECRET_KEY: fakeKey('live') }).status, 1);
console.log('check-moyasar-env: ok');
