#!/usr/bin/env node
// #551: tells the owner which Moyasar settings are missing or wrong on a server. It prints setting NAMES and fixed sentences only:
// no sentence is built from a value, so nothing secret can reach the output (every verdict below is chosen by a yes/no test).
// Run it where the environment is loaded:   node tools/payments/check-moyasar-env.mjs   (exit 0 = ready, 1 = something required is missing or wrong)
const env = process.env;
const prod = String(env.NODE_ENV) === 'production';
const present = (name) => typeof env[name] === 'string' && env[name].trim() !== '';
const pick = (yes, ...cases) => (cases.find(([test]) => test) || [true, yes])[1];
const rows = [];
const add = (name, ok, why, required = true) => rows.push({ name, ok, why, required });

const providerIsMoyasar = (env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'moyasar';
add('PAYMENT_PROVIDER', providerIsMoyasar, providerIsMoyasar ? 'set to moyasar' : present('PAYMENT_PROVIDER') ? 'must be moyasar' : 'missing: set it to moyasar');

const apiKeyPresent = present('MOYASAR_API_KEY');
const sandboxKey = /^sk_test_/.test(env.MOYASAR_API_KEY || '');
const liveKey = /^sk_live_/.test(env.MOYASAR_API_KEY || '');
add('MOYASAR_API_KEY', sandboxKey || liveKey,
  pick('missing', [sandboxKey, 'set (sandbox sk_test key)'], [liveKey, 'set (live sk_live key)'], [apiKeyPresent, 'set but not an sk_test_ / sk_live_ secret key']));

const secretKeyPresent = present('MOYASAR_SECRET_KEY');
const secretMatches = secretKeyPresent && env.MOYASAR_SECRET_KEY === env.MOYASAR_API_KEY;
add('MOYASAR_SECRET_KEY', secretMatches,
  pick('missing: set the same secret key as MOYASAR_API_KEY (refunds fall back to the API key, but set it)', [secretMatches, 'set, same as MOYASAR_API_KEY'], [secretKeyPresent, 'differs from MOYASAR_API_KEY']));

const webhookPresent = present('MOYASAR_WEBHOOK_SECRET');
const webhookLongEnough = webhookPresent && env.MOYASAR_WEBHOOK_SECRET.length >= 16;
add('MOYASAR_WEBHOOK_SECRET', webhookLongEnough,
  pick('missing: every Moyasar webhook is refused until it is set (payments settle late, by verify and the sweep)', [webhookLongEnough, 'set'], [webhookPresent, 'set but shorter than 16 characters']));

const back = env.PAYMENT_RESULT_URL || env.PUBLIC_APP_URL || '';
const backHttps = /^https:\/\/[^/\s]+/i.test(back);
add('PAYMENT_RESULT_URL or PUBLIC_APP_URL', !prod || backHttps,
  pick(prod ? 'missing: card payments are refused (payment_return_url_not_configured)' : 'not set (allowed outside production)', [backHttps, 'set (https)'], [back !== '', 'set but not https']));

const base = env.MOYASAR_API_BASE || '';
const baseHttps = base.startsWith('https://');
add('MOYASAR_API_BASE', !base || !prod || baseHttps, pick('not set (default is the Moyasar https address)', [baseHttps, 'set (https)'], [base !== '', 'set but not https in production']), false);
if (sandboxKey && prod) add('MOYASAR_API_KEY kind', true, 'sandbox key in production: payments are test payments', false);

let bad = 0;
for (const r of rows) {
  if (!r.ok && r.required) bad += 1;
  console.log(`${r.ok ? 'OK     ' : r.required ? 'MISSING' : 'NOTE   '} ${r.name}: ${r.why}`);
}
console.log(bad ? `\n${bad} setting(s) to fix before card payments are ready.` : '\nMoyasar settings are ready.');
process.exit(bad ? 1 : 0);
