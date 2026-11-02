#!/bin/bash
# Which mail provider sends what, and why Mailjet sends little now (lead reviewer, 2026-11-02), READ-ONLY.
# The app rotates the PRIMARY provider every Riyadh month (mail.module.ts: primary = monthIndex mod N over the providers
# that have keys, in MAIL_PROVIDER_ORDER order); the others send only on fallback and one keep-alive mail a week.
# Prints: the provider order (names only), which providers have keys (yes/no), this month's primary as the app computes it,
# mail_log of the last 21 days per provider per day (sent ok / failed / fallback), the status doc per provider (last error
# CODE, first 60 chars with addresses masked, and its time), and the keep-alive claims. No key, address or body is printed.
# Public lines start with "status:".
set -u
DK="sudo -n docker"
$DK exec -i nabdah-backend node - <<'NODE'
const mongoose = require('mongoose');
const say = (s) => console.log('status: mail-providers: ' + s);
(async () => {
  const e = process.env;
  const all = ['resend', 'ses', 'brevo', 'mailjet'];
  const order = e.MAIL_PROVIDER_ORDER ? [...new Set(e.MAIL_PROVIDER_ORDER.split(',').map((s) => s.trim()).filter((p) => all.includes(p)))] : ['resend', 'brevo', 'mailjet'];
  const has = { resend: !!e.RESEND_API_KEY, ses: !!(e.SES_SMTP_HOST && e.SES_SMTP_USER && e.SES_SMTP_PASS), brevo: !!e.BREVO_API_KEY, mailjet: !!(e.MAILJET_API_KEY && e.MAILJET_SECRET_KEY) };
  const active = order.filter((p) => has[p]);
  const r = new Date(Date.now() + 3 * 3600e3); // Riyadh = UTC+3, no DST
  const mi = r.getUTCFullYear() * 12 + r.getUTCMonth();
  say(`order=${e.MAIL_PROVIDER_ORDER ? 'MAIL_PROVIDER_ORDER' : 'default'}:${order.join(',')} keys: ${order.map((p) => p + '=' + (has[p] ? 'yes' : 'no')).join(' ')}`);
  for (let k = -2; k <= 2; k++) { const m = mi + k; say(`month ${Math.floor(m / 12)}-${String(m % 12 + 1).padStart(2, '0')}: primary=${active.length ? active[m % active.length] : 'none'}${k === 0 ? '  <- now' : ''}`); }
  const conn = await mongoose.createConnection(e.MONGO_URL, { dbName: e.DB_NAME || 'nabd_nestjs', directConnection: true, serverSelectionTimeoutMS: 15000 }).asPromise();
  const since = new Date(Date.now() - 21 * 864e5);
  const rows = await conn.collection('mail_log').aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { p: '$provider', d: { $dateToString: { format: '%m-%d', date: '$createdAt', timezone: '+03:00' } } }, ok: { $sum: { $cond: ['$ok', 1, 0] } }, failed: { $sum: { $cond: ['$ok', 0, 1] } }, fb: { $sum: { $cond: ['$fallback_used', 1, 0] } } } },
    { $sort: { '_id.d': 1, '_id.p': 1 } },
  ]).toArray();
  const byDay = new Map();
  for (const x of rows) { const l = byDay.get(x._id.d) || []; l.push(`${x._id.p}:ok=${x.ok}${x.failed ? ' failed=' + x.failed : ''}${x.fb ? ' fallback=' + x.fb : ''}`); byDay.set(x._id.d, l); }
  say(`mail_log last 21 days (Riyadh days): ${rows.length ? '' : 'no rows'}`);
  for (const [d, l] of byDay) say(`  ${d} ${l.join(' | ')}`);
  const last = await conn.collection('mail_log').aggregate([{ $sort: { createdAt: -1 } }, { $group: { _id: '$provider', at: { $first: '$createdAt' }, ok: { $first: '$ok' } } }]).toArray();
  for (const x of last) say(`last send via ${x._id}: ${x.at.toISOString().slice(0, 16)} ok=${x.ok}`);
  const st = await conn.collection('mail_quota').find({ _id: { $regex: ':status$' } }).toArray();
  for (const s of st) say(`${s._id}: last_error=${String(s.last_error || 'none').replace(/[^\s@]+@[^\s@]+/g, '<addr>').slice(0, 60)} at=${s.last_error_at ? new Date(s.last_error_at).toISOString().slice(0, 16) : '-'}`);
  const ka = await conn.collection('mail_keepalive').find({}).toArray();
  for (const k of ka) say(`keep-alive ${k._id}: week=${k.week || k.week_start || '-'} sent_at=${k.sent_at ? new Date(k.sent_at).toISOString().slice(0, 16) : '-'}`);
  await conn.close(); process.exit(0);
})().catch((err) => { console.log('status: mail-providers: FAIL ' + String(err && err.message || err).replace(/[^\s@]+@[^\s@]+/g, '<addr>').slice(0, 160)); process.exit(1); });
NODE
