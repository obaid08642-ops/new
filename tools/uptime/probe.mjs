#!/usr/bin/env node
// P20.6 / P20.7: one external vantage point. Probes the public site and API, prints a one-line result per component, posts the
// result to the status page (POST /ingest, HMAC-signed) when STATUS_INGEST_SECRET is set, and exits 1 when any component is down
// (so the scheduled GitHub Actions run fails and GitHub emails the repository's watchers).
//   node tools/uptime/probe.mjs [--vantage github-actions] [--status-url https://status.nabd.plus]
import { createHmac } from "node:crypto";

export const TARGETS = [
  { component: "website", url: "https://nabd.plus/ar", expect: 200 },
  { component: "api", url: "https://api.nabd.plus/api/v1/health/readiness", expect: 200 },
];
const SLOW_MS = 3000;

/** One probe, twice at most: a single dropped packet is not an outage. */
export async function probeOnce(target, fetchImpl = fetch) {
  const started = Date.now();
  try {
    const res = await fetchImpl(`${target.url}?__status=1`, { headers: { "user-agent": "nabd-uptime/1", "cache-control": "no-cache" }, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    await res.arrayBuffer().catch(() => null);
    const edge = res.headers.get("x-nabd-edge") || "";
    return { component: target.component, ok: res.status === target.expect, ms: Date.now() - started, degraded: /^(ERROR-STALE|UNAVAILABLE)$/.test(edge), code: res.status };
  } catch {
    return { component: target.component, ok: false, ms: Date.now() - started, degraded: false, code: 0 };
  }
}
export async function probe(target, fetchImpl = fetch) {
  const first = await probeOnce(target, fetchImpl);
  return first.ok ? first : probeOnce(target, fetchImpl);
}

export function signBody(secret, body) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function report({ vantage, statusUrl, secret, results }, fetchImpl = fetch) {
  const body = JSON.stringify({ vantage, results: results.map(({ component, ok, ms, degraded }) => ({ component, ok, ms, degraded })) });
  const res = await fetchImpl(`${statusUrl.replace(/\/+$/, "")}/ingest`, { method: "POST", body, headers: { "x-status-signature": signBody(secret, body), "content-type": "application/json" }, signal: AbortSignal.timeout(15_000) });
  return res.status;
}

export async function main(argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log) {
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i > -1 ? argv[i + 1] : d; };
  const vantage = opt("vantage", "github-actions");
  const results = await Promise.all(TARGETS.map((t) => probe(t, fetchImpl)));
  for (const r of results) log(`uptime: ${r.component} ${r.ok ? (r.degraded || r.ms > SLOW_MS ? "DEGRADED" : "ok") : "DOWN"} http=${r.code} ${r.ms}ms (${vantage})`);
  if (env.STATUS_INGEST_SECRET) {
    try { log(`uptime: reported to the status page: HTTP ${await report({ vantage, statusUrl: opt("status-url", env.STATUS_URL || "https://status.nabd.plus"), secret: env.STATUS_INGEST_SECRET, results }, fetchImpl)}`); }
    catch { log("uptime: could not reach the status page (the check itself still counts)"); }
  } else log("uptime: STATUS_INGEST_SECRET is not set; nothing was reported to the status page");
  return results.some((r) => !r.ok) ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main());
