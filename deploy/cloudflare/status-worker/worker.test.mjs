// node --test deploy/cloudflare/status-worker/worker.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import tokens from "../../../packages/design-tokens/tokens.json" with { type: "json" };
import en from "../../../patient-web/messages/en.json" with { type: "json" };
import ar from "../../../patient-web/messages/ar.json" with { type: "json" };
import ur from "../../../patient-web/messages/ur.json" with { type: "json" };
import hi from "../../../patient-web/messages/hi.json" with { type: "json" };
import bn from "../../../patient-web/messages/bn.json" with { type: "json" };
import fil from "../../../patient-web/messages/fil.json" with { type: "json" };
import worker, { applyReport, componentStatus, overall, uptime, emptyState, parseReport, sign, handle, renderPage, publicJson, pageStyle, pickLocale, probe, runCron, TARGETS } from "./worker.mjs";

const MIN = 60_000;
const T = Date.UTC(2026, 9, 17, 12, 0, 0);
const ok = (component, ms = 100, extra = {}) => ({ component, ok: true, ms, ...extra });
const bad = (component) => ({ component, ok: false, ms: 50 });
const kv = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), put: async (k, v) => { m.set(k, v); }, raw: m }; };

test("a component is working only when every fresh vantage says so", () => {
  let s = applyReport(null, "cloudflare", [ok("api")], T);
  s = applyReport(s, "github", [ok("api")], T);
  assert.equal(componentStatus(s, "api", T), "up");
  s = applyReport(s, "github", [bad("api")], T + MIN);
  assert.equal(componentStatus(s, "api", T + MIN), "degraded", "one vantage failing is degraded, not an outage");
  s = applyReport(s, "cloudflare", [bad("api")], T + 2 * MIN);
  assert.equal(componentStatus(s, "api", T + 2 * MIN), "down");
});

test("slow answers and the edge serving a saved copy are degraded; old reports are ignored", () => {
  let s = applyReport(null, "cloudflare", [ok("website", 3500)], T);
  assert.equal(componentStatus(s, "website", T), "degraded");
  s = applyReport(null, "cloudflare", [ok("website", 120, { degraded: true })], T);
  assert.equal(componentStatus(s, "website", T), "degraded");
  s = applyReport(null, "cloudflare", [ok("website")], T);
  assert.equal(componentStatus(s, "website", T + 16 * MIN), "unknown", "a report older than 15 minutes says nothing");
  assert.equal(overall(s, T + 16 * MIN), "unknown");
});

test("an incident opens when a component is down, once, and closes when it works again", () => {
  let s = applyReport(null, "cloudflare", [bad("api")], T);
  s = applyReport(s, "cloudflare", [bad("api")], T + 5 * MIN);
  assert.equal(s.incidents.length, 1);
  assert.equal(s.incidents[0].to, null);
  s = applyReport(s, "cloudflare", [ok("api")], T + 10 * MIN);
  assert.equal(s.incidents.length, 1);
  assert.equal(s.incidents[0].to, T + 10 * MIN);
  s = applyReport(s, "cloudflare", [bad("api")], T + 20 * MIN);
  assert.equal(s.incidents.length, 2, "a new outage is a new incident");
});

test("uptime counts ok checks over the window and the state keeps 90 days", () => {
  let s = emptyState();
  for (let i = 0; i < 100; i += 1) s = applyReport(s, "cloudflare", [i < 98 ? ok("api") : bad("api")], T + i * MIN);
  assert.equal(uptime(s, "api", 30, T + 100 * MIN), 98);
  assert.equal(uptime(s, "nothing", 30, T), null);
  const old = applyReport(s, "cloudflare", [ok("api")], T + 91 * 86_400_000);
  assert.equal(Object.keys(old.days).length, 1, "days older than 90 are dropped");
});

test("/ingest: signed reports only, validated, bounded", async () => {
  const env = { STATUS: kv(), INGEST_SECRET: "test-ingest-secret" };
  const body = JSON.stringify({ vantage: "github-actions", results: [{ component: "api", ok: true, ms: 120 }] });
  const post = (b, sig) => handle(new Request("https://status.nabd.plus/ingest", { method: "POST", body: b, headers: { "x-status-signature": sig } }), env, T);
  assert.equal((await post(body, "0".repeat(64))).status, 403);
  assert.equal((await post(body, "")).status, 403);
  assert.equal((await post(body, await sign("another-secret", body))).status, 403);
  assert.equal((await post(body, await sign("test-ingest-secret", body))).status, 202);
  assert.equal(JSON.parse(env.STATUS.raw.get("state")).vantages["github-actions"].results.api.ok, true);
  const badBody = JSON.stringify({ vantage: "Bad Vantage!", results: [{ component: "api", ok: true }] });
  assert.equal((await post(badBody, await sign("test-ingest-secret", badBody))).status, 400);
  const big = JSON.stringify({ vantage: "x", results: [{ component: "api", ok: true }], pad: "z".repeat(9000) });
  assert.equal((await post(big, await sign("test-ingest-secret", big))).status, 413);
  assert.equal((await handle(new Request("https://status.nabd.plus/ingest"), env, T)).status, 405);
  const off = { STATUS: kv() };
  assert.equal((await handle(new Request("https://status.nabd.plus/ingest", { method: "POST", body }), off, T)).status, 503);
});

test("parseReport rejects anything odd", () => {
  assert.equal(parseReport("not json"), null);
  assert.equal(parseReport(JSON.stringify({ vantage: "a", results: [] })), null);
  assert.equal(parseReport(JSON.stringify({ vantage: "a", results: [{ component: "../etc", ok: true }] })), null);
  assert.equal(parseReport(JSON.stringify({ vantage: "a", results: Array.from({ length: 21 }, () => ({ component: "x", ok: true })) })), null);
  assert.deepEqual(parseReport(JSON.stringify({ vantage: "a", results: [{ component: "x", ok: "yes", ms: 99999999 }] })).results[0], { component: "x", ok: false, ms: 120000, degraded: false });
});

test("the page: six languages, direction, status words, no script, strict CSP, JSON twin", async () => {
  let s = applyReport(null, "cloudflare", [ok("website"), bad("api"), ok("journey_x")], T);
  s = applyReport(s, "github-actions", [ok("website"), bad("api"), ok("journey_x")], T);
  const msgs = { ar, en, ur, hi, bn, fil };
  for (const [loc, all] of Object.entries(msgs)) {
    const html = renderPage(s, loc, T + MIN);
    const m = all.StatusPage;
    assert.ok(html.includes(`lang="${loc}"`));
    assert.ok(html.includes(`dir="${loc === "ar" || loc === "ur" ? "rtl" : "ltr"}"`), loc);
    assert.ok(html.includes(m.title) && html.includes(m.someDown) && html.includes(m.statusDown) && html.includes(m.statusUp), loc);
    assert.ok(html.includes(m.componentWebsite) && html.includes(m.componentApi), loc);
    assert.ok(html.includes("journey_x"), "a component without a name is shown by its id");
    assert.ok(!/\{\w+\}/.test(html), `${loc}: a placeholder was left in the page`);
    assert.ok(!/<script|<img|<iframe|src=|https?:\/\/(?!status)/i.test(html.replace(/<style>[\s\S]*?<\/style>/, "")), `${loc}: the page must load nothing`);
  }
  const res = await handle(new Request("https://status.nabd.plus/?lang=en"), { STATUS: kv() }, T);
  assert.match(res.headers.get("content-security-policy"), /default-src 'none'; style-src 'sha256-/);
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  assert.ok((await res.text()).includes(en.StatusPage.noData), "no state yet: the page says so");
  const json = await (await handle(new Request("https://status.nabd.plus/api/status.json"), { STATUS: kv() }, T)).json();
  assert.equal(json.status, "unknown");
  assert.deepEqual(publicJson(s, T + MIN).components.map((c) => [c.id, c.status]), [["website", "up"], ["api", "down"], ["journey_x", "up"]]);
  assert.equal((await handle(new Request("https://status.nabd.plus/other"), { STATUS: kv() }, T)).status, 404);
});

test("the page text is in all six languages with the same placeholders", () => {
  const keys = Object.keys(en.StatusPage);
  for (const [loc, all] of Object.entries({ ar, ur, hi, bn, fil })) {
    assert.deepEqual(Object.keys(all.StatusPage), keys, loc);
    for (const k of keys) {
      assert.ok(all.StatusPage[k].trim(), `${loc}.${k}`);
      assert.deepEqual((all.StatusPage[k].match(/\{\w+\}/g) || []).sort(), (en.StatusPage[k].match(/\{\w+\}/g) || []).sort(), `${loc}.${k}`);
    }
  }
});

test("the page style uses only colours of the design tokens", () => {
  const known = new Set();
  JSON.stringify(tokens.color).replace(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g, (c) => known.add(c.toLowerCase()));
  const used = pageStyle().match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || [];
  assert.ok(used.length > 10);
  for (const c of used) assert.ok(known.has(c.toLowerCase()), `${c} is not a token colour`);
});

test("language: ?lang wins, then Accept-Language (tl means fil), then Arabic", () => {
  const req = (url, al) => new Request(url, { headers: al ? { "accept-language": al } : {} });
  assert.equal(pickLocale(req("https://s/?lang=ur", "en")), "ur");
  assert.equal(pickLocale(req("https://s/", "tl-PH,en;q=0.5")), "fil");
  assert.equal(pickLocale(req("https://s/", "de,hi;q=0.8")), "hi");
  assert.equal(pickLocale(req("https://s/", "de")), "ar");
  assert.equal(pickLocale(req("https://s/?lang=zz")), "ar");
});

test("probing: ok on the expected status, degraded on a saved copy, failed on error or timeout", async () => {
  const seen = [];
  const f = (status, headers = {}) => async (u) => { seen.push(u); return new Response("x", { status, headers }); };
  assert.deepEqual((await probe(TARGETS[0], f(200))).ok, true);
  assert.ok(seen[0].endsWith("?__status=1"));
  assert.equal((await probe(TARGETS[1], f(503))).ok, false);
  const stale = await probe(TARGETS[0], f(200, { "x-nabd-edge": "ERROR-STALE" }));
  assert.deepEqual([stale.ok, stale.degraded], [true, true]);
  const boom = await probe(TARGETS[0], async () => { throw new Error("network"); });
  assert.deepEqual([boom.ok, boom.code], [false, 0]);
});

test("the cron probes both targets and records them as the cloudflare vantage", async () => {
  const env = { STATUS: kv() };
  const results = await runCron(env, T, async (u) => new Response("x", { status: u.includes("api.") ? 503 : 200 }));
  assert.deepEqual(results.map((r) => [r.component, r.ok]), [["website", true], ["api", false]]);
  const state = JSON.parse(env.STATUS.raw.get("state"));
  assert.deepEqual(Object.keys(state.vantages), ["cloudflare"]);
  assert.equal(componentStatus(state, "api", T), "down");
  assert.equal(typeof worker.scheduled, "function");
});

test("the 15-minute GitHub probe stays fresh for 35 minutes, the Cloudflare vantage for 15", () => {
  const s = applyReport(applyReport(null, "cloudflare", [ok("website")], T), "github-actions", [ok("website")], T);
  assert.equal(componentStatus(s, "website", T + 20 * MIN), "up", "20 min later only the GitHub vantage is fresh and it says up");
  assert.equal(componentStatus(s, "website", T + 36 * MIN), "unknown", "after 35 minutes nobody is fresh");
});
