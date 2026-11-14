#!/usr/bin/env node
// p50/p95 per endpoint the patient screens call, against a seeded local backend.
// Usage: node tools/perf/api-inventory.mjs [out.json]   (API_BASE, PERF_TOKEN optional)
// Sequential requests (1 warm-up + N timed) so numbers are service time, not queueing.
import { writeFileSync } from "node:fs";

const base = process.env.API_BASE || "http://127.0.0.1:8002/api/v1";
const token = process.env.PERF_TOKEN || "";
const N = Number(process.env.N || 40);
const get = async (p, auth = false) => {
  const t = performance.now();
  const r = await fetch(base + p, { headers: auth && token ? { Authorization: `Bearer ${token}` } : {} });
  const buf = await r.arrayBuffer();
  return { ms: performance.now() - t, status: r.status, bytes: buf.byteLength, cc: r.headers.get("cache-control") || "", body: buf };
};
const json = async (p) => JSON.parse(Buffer.from((await get(p)).body).toString("utf8"));
const arr = (j) => (Array.isArray(j) ? j : j?.items || j?.data || j?.results || []);

const docs = arr(await json("/care/doctors?limit=5"));
const docId = docs[0]?._id || docs[0]?.id;
const arts = arr(await json("/articles?limit=3"));
const artId = arts[0]?.slug || arts[0]?._id || arts[0]?.id;
const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const eps = [
  ["GET /config"], ["GET /modules"], ["GET /content/home"], ["GET /home/offers"],
  ["GET /care/specialties"], ["GET /care/doctors"], ["GET /care/doctors?limit=20"],
  ["GET /care/doctors?sort=available_today"], ["GET /care/doctors?q=a"],
  docId && [`GET /care/doctors/:id`, `/care/doctors/${docId}`],
  docId && [`GET /care/doctors/:id/slots`, `/care/doctors/${docId}/slots?date=${day}`],
  ["GET /labs/services"], ["GET /labs/packages"], ["GET /radiology/services"],
  ["GET /home-care/services"], ["GET /home-care/providers"], ["GET /home-care/packages"], ["GET /nursing/catalog"],
  ["GET /articles"], artId && ["GET /articles/:id", `/articles/${artId}`],
  ["GET /public/categories/ar"], ["GET /medicines/search?q=pan"], ["GET /medicines/search/trending"],
  ["GET /search?q=a"], ["GET /insurance/companies"], ["GET /locations/cities"],
  ["GET /orders/mine (auth)", "/orders/mine", true], ["GET /notifications (auth)", "/notifications", true],
  ["GET /loyalty/me (auth)", "/loyalty/me", true], ["GET /health/profile (auth)", "/health/profile", true],
].filter(Boolean).map((e) => ({ name: e[0], path: e[1] || e[0].replace(/^GET /, ""), auth: !!e[2] }));

const pct = (a, p) => a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)];
const rows = [];
for (const e of eps) {
  await get(e.path, e.auth);
  const t = [];
  let last;
  for (let i = 0; i < N; i++) { last = await get(e.path, e.auth); t.push(last.ms); }
  t.sort((a, b) => a - b);
  rows.push({ endpoint: e.name, path: e.path, status: last.status, bytes: last.bytes, cacheControl: last.cc,
    p50: +pct(t, 50).toFixed(1), p95: +pct(t, 95).toFixed(1), max: +t[t.length - 1].toFixed(1) });
  console.log(rows.at(-1));
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
