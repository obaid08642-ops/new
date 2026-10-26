#!/bin/bash
# Alert mails the owner receives (lead reviewer, 2026-10-26), READ-ONLY. Groups mail_log of the last 48 h by subject (numbers and
# ids stripped so repeats group together): count, provider, ok/failed, first and last time. Never prints an address or a body.
# Also prints the SLO alert states and the synthetic-journey failures recorded by the backend, when those collections exist.
# Public lines start with "status:".
set -u
DK="sudo -n docker"
$DK exec -i nabdah-backend node - <<'NODE'
const mongoose = require('mongoose');
(async () => {
  const conn = await mongoose.createConnection(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: true, serverSelectionTimeoutMS: 15000 }).asPromise();
  const since = new Date(Date.now() - 48 * 3600e3);
  const rows = await conn.collection('mail_log').aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $project: { s: { $replaceAll: { input: { $ifNull: ['$subject', ''] }, find: '\n', replacement: ' ' } }, provider: 1, ok: 1, createdAt: 1 } },
    { $group: { _id: '$s', n: { $sum: 1 }, providers: { $addToSet: '$provider' }, failed: { $sum: { $cond: ['$ok', 0, 1] } }, first: { $min: '$createdAt' }, last: { $max: '$createdAt' } } },
    { $sort: { n: -1 } }, { $limit: 400 },
  ]).toArray();
  const norm = (s) => String(s).replace(/[0-9a-f]{8,}/gi, '#').replace(/\d+/g, '#').slice(0, 140);
  const g = new Map();
  for (const r of rows) { const k = norm(r._id); const x = g.get(k) || { n: 0, failed: 0, p: new Set(), first: r.first, last: r.last }; x.n += r.n; x.failed += r.failed; r.providers.forEach((p) => x.p.add(p)); if (r.first < x.first) x.first = r.first; if (r.last > x.last) x.last = r.last; g.set(k, x); }
  const list = [...g.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 40);
  console.log(`status: mails 48h: ${rows.reduce((a, r) => a + r.n, 0)} sent, ${list.length} subject groups`);
  for (const [k, x] of list) console.log(`status: mail x${x.n} failed=${x.failed} via=${[...x.p].join('+')} ${x.first.toISOString().slice(5, 16)}→${x.last.toISOString().slice(5, 16)} "${k}"`);
  for (const c of ['slo_alert_states', 'slo_alerts', 'alert_states']) {
    const exists = (await conn.db.listCollections({ name: c }).toArray()).length;
    if (!exists) continue;
    const st = await conn.collection(c).find({}).limit(40).toArray();
    for (const s of st) console.log(`status: ${c} ${s.key || s._id} state=${s.state || s.status || '-'} since=${s.since || s.updatedAt || '-'}`);
  }
  await conn.close(); process.exit(0);
})().catch((e) => { console.log('status: alert mails check FAIL ' + String(e && e.message || e).slice(0, 160)); process.exit(1); });
NODE
