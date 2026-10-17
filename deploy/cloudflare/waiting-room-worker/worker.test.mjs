// node --test deploy/cloudflare/waiting-room-worker/
// The worker with a stand-in origin and a stand-in Durable Object namespace; time moves with a fake clock.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import tokens from "../../../packages/design-tokens/tokens.json" with { type: "json" };
import { handle, Room, arrive, poll, GUARDED, ADMIT_COOKIE, TICKET_COOKIE, waitingStyle } from "./worker.mjs";

let now = 1_000_000;
Date.now = () => now;

const SECRET = "waiting-room-test-secret";
const env = (over = {}) => ({ WAITING_ROOM: "on", WAITING_ROOM_SECRET: SECRET, ADMIT_PER_MINUTE: "120", BURST: "60", ADMIT_MINUTES: "15", ...over });
let originCalls;
let roomEnv;

function namespace(cfgEnv) {
  const data = new Map();
  const room = new Room({ storage: { get: async (k) => data.get(k), put: async (k, v) => { data.set(k, v); } } }, cfgEnv);
  return { idFromName: () => "checkout", get: () => ({ fetch: (u) => room.fetch(new Request(u)) }) };
}

beforeEach(() => {
  originCalls = 0;
  globalThis.fetch = async () => { originCalls++; return new Response("<html>checkout</html>", { status: 200, headers: { "content-type": "text/html" } }); };
  roomEnv = env();
  roomEnv.ROOM = namespace(roomEnv);
});

const page = (path, cookie = "", headers = {}) => new Request(`https://nabd.plus${path}`, { headers: { accept: "text/html", ...(cookie ? { cookie } : {}), ...headers } });
const cookiesOf = (res) => (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")]).filter(Boolean);
const jar = (res, prev = "") => {
  const map = new Map(prev.split("; ").filter(Boolean).map((c) => c.split("=")));
  for (const c of cookiesOf(res)) { const [kv] = c.split(";"); const [k, ...v] = kv.split("="); if (/Max-Age=0/.test(c)) map.delete(k); else map.set(k, v.join("=")); }
  return [...map].map(([k, v]) => `${k}=${v}`).join("; ");
};

test("only the checkout entry pages are guarded; payment results, the API and other pages pass", () => {
  for (const p of ["/ar/cart/checkout", "/en/pharmacy/payment", "/fil/cart/checkout/"]) assert.ok(GUARDED.test(p), p);
  for (const p of ["/ar/payments/result", "/ar/payments/success", "/ar/cart", "/api/v1/cart/checkout", "/ar/p/panadol"]) assert.ok(!GUARDED.test(p), p);
});

test("off, no secret or no Durable Object: everything goes to the origin", async () => {
  for (const e of [env({ WAITING_ROOM: "off" }), env({ WAITING_ROOM_SECRET: "" }), env()]) {
    const r = await handle(page("/ar/cart/checkout"), e);
    assert.equal(await r.text(), "<html>checkout</html>");
  }
  assert.equal(originCalls, 3);
});

test("a spike above capacity queues visitors instead of failing them, then admits them in order", async () => {
  // 1,000 visitors in 10 s against 120 admissions a minute (burst 60)
  const visitors = [];
  for (let i = 0; i < 1000; i++) {
    now += 10;
    const r = await handle(page("/ar/cart/checkout"), roomEnv);
    assert.equal(r.status, 200, "nobody gets an error");
    visitors.push({ cookie: jar(r), admitted: r.headers.get("x-nabd-waiting-room") === "admitted", body: r.headers.get("x-nabd-waiting-room") === "queued" ? await r.text() : "" });
  }
  const admittedAtOnce = visitors.filter((v) => v.admitted).length;
  assert.ok(admittedAtOnce >= 60 && admittedAtOnce <= 85, `burst 60 + ~20 for the 10 s: got ${admittedAtOnce}`);
  assert.equal(originCalls, admittedAtOnce, "the origin saw only the admitted ones");
  const first = visitors.find((v) => !v.admitted);
  assert.match(first.body, /أنت في الطابور/);
  assert.match(first.body, /dir="rtl"/);
  // time passes; every waiting visitor refreshes (the page does it every 15 s)
  const order = [];
  for (let minute = 0; minute < 10 && order.length < 1000 - admittedAtOnce; minute++) {
    now += 60_000;
    for (const v of visitors) {
      if (v.admitted) continue;
      const r = await handle(page("/ar/cart/checkout", v.cookie), roomEnv);
      assert.equal(r.status, 200);
      v.cookie = jar(r, v.cookie);
      if (r.headers.get("x-nabd-waiting-room") === "admitted") { v.admitted = true; order.push(visitors.indexOf(v)); }
    }
  }
  assert.equal(visitors.filter((v) => !v.admitted).length, 0, "everyone got in");
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "admitted in arrival order");
});

test("an admitted visitor passes until the admission expires; a forged cookie does not", async () => {
  const r = await handle(page("/en/pharmacy/payment"), roomEnv);
  assert.equal(r.headers.get("x-nabd-waiting-room"), "admitted");
  const c = jar(r);
  assert.match(c, new RegExp(`${ADMIT_COOKIE}=`));
  const again = await handle(page("/en/pharmacy/payment", c), roomEnv);
  assert.equal(again.headers.get("x-nabd-waiting-room"), null, "passes without asking the room");
  const forged = `${ADMIT_COOKIE}=${encodeURIComponent(`a:${now + 3_600_000}.AAAA`)}`;
  for (let i = 0; i < 70; i++) await handle(page("/en/cart/checkout"), roomEnv); // use up the burst
  const f = await handle(page("/en/cart/checkout", forged), roomEnv);
  assert.equal(f.headers.get("x-nabd-waiting-room"), "queued");
  now += 16 * 60_000;
  const expired = await handle(page("/en/pharmacy/payment", c), roomEnv);
  assert.notEqual(expired.headers.get("x-nabd-waiting-room"), null, "asks the room again after 15 min");
});

test("a forged or unknown ticket cannot jump the queue", async () => {
  for (let i = 0; i < 80; i++) await handle(page("/ar/cart/checkout"), roomEnv);
  const forged = `${TICKET_COOKIE}=${encodeURIComponent("t:1.AAAA")}`;
  const r = await handle(page("/ar/cart/checkout", forged), roomEnv);
  assert.equal(r.headers.get("x-nabd-waiting-room"), "queued");
  const cfg = { perMinute: 60, burst: 1 };
  const a = arrive(null, 0, cfg);
  const p = poll(a.state, 0, cfg, 999);
  assert.equal(p.admitted, false);
  assert.equal(p.ticket, a.state.issued + 1, "an unknown ticket is queued again at the end");
});

test("the waiting page has no script, a strict CSP with the style's hash, and only design-token colours", async () => {
  for (let i = 0; i < 80; i++) await handle(page("/en/cart/checkout"), roomEnv);
  const r = await handle(page("/en/cart/checkout"), roomEnv);
  const html = await r.text();
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.match(r.headers.get("content-security-policy"), /default-src 'none'; style-src 'sha256-[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /http-equiv="refresh" content="15"/);
  assert.match(html, /You&#39;re in the queue/);
  const tokenColours = new Set(JSON.stringify(tokens).match(/#[0-9A-Fa-f]{6}/g));
  const used = waitingStyle().match(/#[0-9A-Fa-f]{6}/g);
  assert.ok(used.length > 0);
  for (const c of used) assert.ok(tokenColours.has(c), `${c} is not a design token`);
});

test("a broken room fails open: the visitor goes to checkout", async () => {
  const broken = env({ ROOM: { idFromName: () => "x", get: () => ({ fetch: async () => { throw new Error("DO down"); } }) } });
  const r = await handle(page("/ar/cart/checkout"), broken);
  assert.equal(await r.text(), "<html>checkout</html>");
});
