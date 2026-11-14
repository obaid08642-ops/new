#!/usr/bin/env node
// Lighthouse mobile (simulated 4G) over every patient-web route in
// tools/live/web_walkthrough_routes.json. Usage:
//   node tools/perf/web-inventory.mjs <outDir> [runs=1] [--only=/ar/c,/ar/x] [--lh=<lighthouse bin>]
// Needs a running production server on http://localhost:3000 and CHROME_PATH.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = args[0];
const runs = Number(args[1] && !args[1].startsWith("--") ? args[1] : 1);
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const lh = (args.find((a) => a.startsWith("--lh=")) || "").slice(5) || "lighthouse";
const base = process.env.WEB_BASE || "http://localhost:3000";
const token = process.env.PERF_TOKEN || "";
mkdirSync(out, { recursive: true });

const groups = JSON.parse(readFileSync(join(here, "../live/web_walkthrough_routes.json"), "utf8"));
const rows = [];
for (const [group, list] of Object.entries(groups)) for (const r of list) rows.push({ group, route: `/ar${r}` });
const todo = only.length ? rows.filter((r) => only.includes(r.route)) : rows;
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const resPath = join(out, "results.json");
const results = existsSync(resPath) ? JSON.parse(readFileSync(resPath, "utf8")) : {};
// Chrome drops the Cookie header on redirect hops, so follow redirects here (with the cookie) and audit the final URL.
async function resolve(route) {
  let path = route;
  for (let hop = 0; hop < 6; hop++) {
    const r = await fetch(base + path, { redirect: "manual", headers: token ? { Cookie: `nabd_access=${token}; nabd_session_hint=p.${process.env.PERF_USER || "perf-pat-000001"}` } : {} });
    const loc = r.headers.get("location");
    if (r.status < 300 || r.status >= 400 || !loc) return path;
    path = loc.startsWith("http") ? new URL(loc).pathname + new URL(loc).search : loc;
    if (path.includes("/login")) return path;
  }
  return path;
}
for (const { group, route } of todo) {
  const target = await resolve(route).catch(() => route);
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const file = join(out, `tmp.json`);
    const a = [base + target, "--only-categories=performance", "--output=json", `--output-path=${file}`,
      "--chrome-flags=--headless=new --no-sandbox", "--quiet"];
    if (token) a.push(`--extra-headers=${JSON.stringify({ Cookie: `nabd_access=${token}; nabd_session_hint=p.${process.env.PERF_USER || "perf-pat-000001"}` })}`);
    const p = spawnSync(lh, a, { timeout: 180000, env: process.env });
    if (p.status !== 0 || !existsSync(file)) { samples.push({ error: String(p.stderr || "").slice(0, 200) }); continue; }
    const d = JSON.parse(readFileSync(file, "utf8"));
    const au = d.audits;
    const js = (au["network-requests"]?.details?.items || []).filter((x) => x.resourceType === "Script")
      .reduce((s, x) => s + (x.transferSize || 0), 0);
    samples.push({
      lcp: au["largest-contentful-paint"].numericValue, tbt: au["total-blocking-time"].numericValue,
      cls: au["cumulative-layout-shift"].numericValue, ttfb: au["server-response-time"]?.numericValue ?? 0,
      js, final: d.finalDisplayedUrl || d.finalUrl, score: d.categories.performance.score,
    });
  }
  const ok = samples.filter((s) => !s.error);
  results[route] = ok.length
    ? { group, n: ok.length, redirectedTo: target === route ? undefined : target, final: ok[0].final.replace(base, ""), lcp: med(ok.map((s) => s.lcp)), tbt: med(ok.map((s) => s.tbt)),
        cls: med(ok.map((s) => s.cls)), ttfb: med(ok.map((s) => s.ttfb)), js: med(ok.map((s) => s.js)), score: med(ok.map((s) => s.score)) }
    : { group, error: samples[0]?.error || "failed" };
  writeFileSync(resPath, JSON.stringify(results, null, 1));
  console.log(route, JSON.stringify(results[route]));
}
