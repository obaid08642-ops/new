#!/usr/bin/env node
// #551: tells the owner which Moyasar settings are missing or wrong on a server. It prints NAMES and verdicts only, never a value
// (a key kind such as sk_test / sk_live is printed, nothing else of the key). Run it where the environment is loaded:
//   node tools/payments/check-moyasar-env.mjs          (exit 0 = ready, 1 = something required is missing or wrong)
const env = process.env;
const prod = String(env.NODE_ENV) === 'production';
const set = (n) => typeof env[n] === 'string' && env[n].trim() !== '';
const rows = [];
const add = (name, ok, why, required = true) => rows.push({ name, ok, why, required });

add('PAYMENT_PROVIDER', (env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'moyasar',
  set('PAYMENT_PROVIDER') ? 'must be moyasar' : 'missing: set it to moyasar');
const kind = /^sk_(test|live)_/.exec(env.MOYASAR_API_KEY || '')?.[1];
add('MOYASAR_API_KEY', !!kind, !set('MOYASAR_API_KEY') ? 'missing' : kind ? `set (${kind} key)` : 'set but not an sk_test_ / sk_live_ secret key');
add('MOYASAR_SECRET_KEY', set('MOYASAR_SECRET_KEY') && env.MOYASAR_SECRET_KEY === env.MOYASAR_API_KEY,
  !set('MOYASAR_SECRET_KEY') ? 'missing: same secret key as MOYASAR_API_KEY (refunds fall back to the API key, but set it)' : env.MOYASAR_SECRET_KEY === env.MOYASAR_API_KEY ? 'set, same as MOYASAR_API_KEY' : 'differs from MOYASAR_API_KEY');
add('MOYASAR_WEBHOOK_SECRET', set('MOYASAR_WEBHOOK_SECRET') && env.MOYASAR_WEBHOOK_SECRET.length >= 16,
  !set('MOYASAR_WEBHOOK_SECRET') ? 'missing: every Moyasar webhook is refused until it is set (payments settle late, by verify and the sweep)' : env.MOYASAR_WEBHOOK_SECRET.length >= 16 ? 'set' : 'set but shorter than 16 characters');
const back = env.PAYMENT_RESULT_URL || env.PUBLIC_APP_URL || '';
add('PAYMENT_RESULT_URL or PUBLIC_APP_URL', !prod || /^https:\/\/[^/\s]+/i.test(back),
  !back ? (prod ? 'missing: card payments are refused (payment_return_url_not_configured)' : 'not set (allowed outside production)') : /^https:\/\//i.test(back) ? 'set (https)' : 'set but not https');
const base = env.MOYASAR_API_BASE;
add('MOYASAR_API_BASE', !base || !prod || base.startsWith('https://'), !base ? 'not set (default https://api.moyasar.com/v1)' : base.startsWith('https://') ? 'set (https)' : 'set but not https in production', false);
if (kind === 'test' && prod) add('MOYASAR_API_KEY kind', true, 'sandbox key in production: payments are test payments', false);

let bad = 0;
for (const r of rows) { if (!r.ok && r.required) bad += 1; console.log(`${r.ok ? 'OK     ' : r.required ? 'MISSING' : 'NOTE   '} ${r.name}: ${r.why}`); }
console.log(bad ? `\n${bad} setting(s) to fix before card payments are ready.` : '\nMoyasar settings are ready.');
process.exit(bad ? 1 : 0);
