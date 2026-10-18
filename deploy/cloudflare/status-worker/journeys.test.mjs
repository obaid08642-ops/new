// node --test deploy/cloudflare/status-worker/journeys.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { runJourneys, journeyNotices, notify, noticeText, JOURNEY_IDS } from "./journeys.mjs";
import { runJourneyCron, emptyState, componentStatus, JOURNEY_CRON } from "./worker.mjs";
import worker from "./worker.mjs";

const T = Date.UTC(2026, 9, 17, 12, 0, 0);
const html = `<html>${"x".repeat(6000)}</html>`;
const ENV = { SYNTH_IDENTIFIER: "synthetic@nabd.test", SYNTH_PASSWORD: "fixture-not-a-secret" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A stand-in for the site and the API. `over` replaces answers by "METHOD path". */
function site(over = {}, log = []) {
  let cart = [];
  const routes = {
    "GET https://nabd.plus/ar": () => new Response(html),
    "GET /search/suggest": () => json({ suggestions: [{ id: "m1", type: "medicine", slug: "panadol", name: "Panadol" }, { id: "d1", type: "doctor", slug: "dr-x" }] }),
    "GET https://nabd.plus/ar/p/panadol": () => new Response(html),
    "GET /medicines/m1": () => json({ id: "m1", name_ar: "x" }),
    "POST /auth/login": () => json({ token: "jwt-token-value" }),
    "GET /users/me": () => json({ id: "u1" }),
    "POST /cart/items": () => { cart = [{ line_id: "L1", service_id: "m1", qty: 1 }]; return json({ lines: cart }); },
    "GET /cart": () => json({ lines: cart }),
    "DELETE /cart/items/L1": () => { cart = []; return json({ lines: [] }); },
    "GET /care/doctors?limit=5": () => json([{ id: "doc1" }]),
    "GET /care/doctors/doc1/slots": () => json({ slots: [{ start: "x" }] }),
    ...over,
  };
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || "GET";
    const path = url.replace("https://api.nabd.plus/api/v1", "").split("&__")[0].split("?__")[0];
    log.push({ method, url, headers: init.headers || {}, body: init.body });
    const key = Object.keys(routes).filter((k) => k.startsWith(`${method} `)).find((k) => { const p = k.slice(method.length + 1); return p.startsWith("https://") ? url.startsWith(p) : path.startsWith(p); });
    if (!key) return new Response("no route", { status: 404 });
    const r = routes[key]();
    if (r instanceof Error) throw r;
    return r;
  };
  return { fetchImpl, cart: () => cart };
}

test("all six journeys pass, in order, and the test line leaves the cart", async () => {
  const log = []; const s = site({}, log);
  const res = await runJourneys(ENV, { fetchImpl: s.fetchImpl, now: T });
  assert.deepEqual(res.map((r) => r.component), JOURNEY_IDS);
  assert.ok(res.every((r) => r.ok), JSON.stringify(res));
  assert.deepEqual(s.cart(), [], "the cart is back as it was");
  assert.ok(log.some((c) => c.method === "DELETE"));
});

test("it never touches checkout or payment, and the write carries an idempotency key", async () => {
  const log = []; const s = site({}, log);
  await runJourneys(ENV, { fetchImpl: s.fetchImpl, now: T });
  for (const c of log) assert.ok(!/checkout|payment|pay-|order/i.test(c.url), c.url);
  for (const c of log.filter((x) => x.method === "POST" && x.url.endsWith("/cart/items") || x.method === "DELETE")) assert.match(c.headers["idempotency-key"], /^[0-9a-f-]{36}$/);
  const add = log.find((c) => c.url.endsWith("/cart/items"));
  assert.deepEqual(JSON.parse(add.body), { medicine_id: "m1", quantity: 1 });
  assert.equal(log.find((c) => c.url.endsWith("/cart/items")).headers.authorization, "Bearer jwt-token-value");
});

test("without the test patient the sign-in and cart journeys are skipped, not failed", async () => {
  const res = await runJourneys({}, { fetchImpl: site().fetchImpl, now: T });
  assert.deepEqual(res.map((r) => r.component), ["home", "search", "product", "doctors"]);
  assert.ok(res.every((r) => r.ok));
});

test("each kind of breakage fails the right journey, with a reason that holds no secret", async () => {
  const cases = [
    ["home", { "GET https://nabd.plus/ar": () => new Response("down", { status: 502 }) }, "http 502"],
    ["search", { "GET /search/suggest": () => json({ suggestions: [] }) }, "no suggestion"],
    ["product", { "GET /medicines/m1": () => json({}, 500) }, "api http 500"],
    ["login", { "POST /auth/login": () => json({ message: "bad" }, 401) }, "http 401"],
    ["cart", { "GET /cart": () => json({ lines: [] }) }, "not in the cart"],
    ["doctors", { "GET /care/doctors/doc1/slots": () => json({ nope: 1 }) }, "no list"],
  ];
  for (const [id, over, reason] of cases) {
    const res = await runJourneys(ENV, { fetchImpl: site(over).fetchImpl, now: T });
    const r = res.find((x) => x.component === id);
    assert.equal(r.ok, false, id);
    assert.ok(r.detail.includes(reason), `${id}: ${r.detail}`);
    assert.ok(!JSON.stringify(res).includes("fixture-not-a-secret") && !JSON.stringify(res).includes("jwt-token-value"), "no secret in a result");
    for (const other of ["home", "doctors"].filter((x) => x !== id)) assert.equal(res.find((x) => x.component === other).ok, true, `${id}: ${other} is independent`);
  }
});

test("a single dropped request is retried once and does not count; a cart that failed to remove its line says so", async () => {
  let n = 0;
  const flaky = site({ "GET /search/suggest": () => { n += 1; return n === 1 ? new Error("reset") : json({ suggestions: [{ id: "m1", type: "medicine", slug: "panadol" }] }); } });
  const res = await runJourneys(ENV, { fetchImpl: flaky.fetchImpl, now: T });
  assert.equal(res.find((r) => r.component === "search").ok, true);
  const stuck = site({ "DELETE /cart/items/L1": () => json({}, 500) });
  const r2 = (await runJourneys(ENV, { fetchImpl: stuck.fetchImpl, now: T })).find((r) => r.component === "cart");
  assert.equal(r2.ok, false);
  assert.match(r2.detail, /could not remove the test line/);
});

test("the cart is cleaned even when reading it fails", async () => {
  const log = []; const s = site({ "GET /cart": () => new Error("boom") }, log);
  const r = (await runJourneys(ENV, { fetchImpl: s.fetchImpl, now: T })).find((x) => x.component === "cart");
  assert.equal(r.ok, false);
  assert.deepEqual(s.cart(), []);
});

test("an alert fires on the second failure in a row, once; recovery is announced once", () => {
  let st = {};
  const run = (ok) => { const r = journeyNotices(st, [{ component: "search", ok, detail: "http 500" }]); st = r.journeys; return r.notices; };
  assert.deepEqual(run(false), [], "the first failure is not an alert");
  assert.deepEqual(run(false), [{ component: "search", type: "down", detail: "http 500" }]);
  assert.deepEqual(run(false), [], "still failing: no second alert");
  assert.deepEqual(run(true), [{ component: "search", type: "recovered" }]);
  assert.deepEqual(run(true), []);
  assert.deepEqual(run(false), []);   // the counter restarted
});

test("notify: Telegram and e-mail go out when configured, a failing channel does not stop the other, no secret is returned", async () => {
  const calls = [];
  const env = { TELEGRAM_BOT_TOKEN: "TG-TOKEN-1", TELEGRAM_ALERT_CHAT_ID: "77", RESEND_API_KEY: "re_key_1", OPS_ALERT_EMAIL: "owner@example.test", MAIL_FROM: "Nabd <a@nabd.plus>" };
  const f = async (url, init) => { calls.push({ url, init }); if (url.includes("resend")) throw new Error("resend down"); return new Response("{}", { status: 200 }); };
  const out = await notify(env, "subject", "body", f);
  assert.deepEqual(out, { telegram: true, email: false });
  assert.equal(calls[0].url, "https://api.telegram.org/botTG-TOKEN-1/sendMessage");
  assert.equal(JSON.parse(calls[0].init.body).chat_id, "77");
  assert.equal(calls[1].init.headers.authorization, "Bearer re_key_1");
  assert.deepEqual(JSON.parse(calls[1].init.body).to, ["owner@example.test"]);
  assert.deepEqual(await notify({}, "s", "b", f), { telegram: false, email: false });
  const t = noticeText({ component: "login", type: "down", detail: "http 401" });
  assert.match(t.subject, /FAILED\] login/);
  assert.match(t.text, /two runs in a row \(http 401\)/);
  assert.match(t.text, /docs\/ops\/synthetic-journeys\.md/);
});

test("the cron: reports as the journeys vantage, alerts after the second failing run, keeps counters even if a notification fails", async () => {
  const kvData = new Map();
  const env = { ...ENV, TELEGRAM_BOT_TOKEN: "t", TELEGRAM_ALERT_CHAT_ID: "1", STATUS: { get: async (k) => (kvData.has(k) ? JSON.parse(kvData.get(k)) : null), put: async (k, v) => { kvData.set(k, v); } } };
  const sent = [];
  const mk = (broken) => {
    const s = site(broken ? { "GET /care/doctors?limit=5": () => json({}, 503) } : {});
    return async (url, init) => { if (String(url).includes("telegram")) { sent.push(JSON.parse(init.body).text); return new Response("{}"); } return s.fetchImpl(url, init); };
  };
  let r = await runJourneyCron(env, T, mk(true));
  assert.deepEqual(r.sent, []);
  r = await runJourneyCron(env, T + 10 * 60_000, mk(true));
  assert.deepEqual(r.sent.map((x) => [x.component, x.type, x.telegram]), [["doctors", "down", true]]);
  assert.match(sent[0], /journey FAILED\] doctors/);
  r = await runJourneyCron(env, T + 20 * 60_000, mk(true));
  assert.deepEqual(r.sent, []);
  const state = JSON.parse(kvData.get("state"));
  assert.deepEqual(Object.keys(state.vantages), ["journeys"]);
  assert.equal(componentStatus(state, "doctors", T + 20 * 60_000), "down");
  assert.equal(componentStatus(state, "search", T + 20 * 60_000), "up");
  r = await runJourneyCron(env, T + 30 * 60_000, mk(false));
  assert.deepEqual(r.sent.map((x) => [x.component, x.type]), [["doctors", "recovered"]]);
  assert.ok(!JSON.stringify([...kvData.values()]).includes("fixture-not-a-secret"), "the password is not stored");
});

test("the scheduled handler picks the journeys on their cron and the probes on the other", async () => {
  assert.equal(JOURNEY_CRON, "*/10 * * * *");
  const ran = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { ran.push(String(url)); return new Response("ok", { status: 200 }); };
  const kvData = new Map();
  const env = { STATUS: { get: async () => null, put: async (k, v) => { kvData.set(k, v); } } };
  try {
    const tasks = [];
    worker.scheduled({ cron: "*/5 * * * *" }, env, { waitUntil: (p) => tasks.push(p) });
    await Promise.all(tasks);
    assert.ok(ran.some((u) => u.includes("health/readiness")) && !ran.some((u) => u.includes("search/suggest")));
    ran.length = 0;
    worker.scheduled({ cron: "*/10 * * * *" }, env, { waitUntil: (p) => tasks.push(p) });
    await Promise.all(tasks);
    assert.ok(ran.some((u) => u.includes("search/suggest")));
  } finally { globalThis.fetch = realFetch; }
  assert.ok(emptyState().incidents);
});
