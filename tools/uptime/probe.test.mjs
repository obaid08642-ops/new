// node --test tools/uptime/probe.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { probe, report, main, signBody, TARGETS } from "./probe.mjs";

const respond = (status, headers = {}) => async () => new Response("x", { status, headers });

test("a dropped probe is retried once; a real outage is not hidden", async () => {
  let n = 0;
  const flaky = async () => { n += 1; if (n === 1) throw new Error("reset"); return new Response("x", { status: 200 }); };
  assert.equal((await probe(TARGETS[0], flaky)).ok, true);
  assert.equal(n, 2);
  n = 0;
  assert.equal((await probe(TARGETS[1], async () => { n += 1; return new Response("x", { status: 503 }); })).ok, false);
  assert.equal(n, 2);
});

test("the report is signed with the shared secret, exactly as the status worker checks it", async () => {
  let seen;
  const status = await report({ vantage: "github-actions", statusUrl: "https://status.example.test/", secret: "s3cret", results: [{ component: "api", ok: true, ms: 12, degraded: false, code: 200 }] }, async (url, init) => { seen = { url, init }; return new Response("ok", { status: 202 }); });
  assert.equal(status, 202);
  assert.equal(seen.url, "https://status.example.test/ingest");
  assert.equal(seen.init.headers["x-status-signature"], createHmac("sha256", "s3cret").update(seen.init.body).digest("hex"));
  assert.equal(seen.init.headers["x-status-signature"], signBody("s3cret", seen.init.body));
  assert.ok(!seen.init.body.includes("code"), "only the fields the worker reads are sent");
  assert.deepEqual(JSON.parse(seen.init.body), { vantage: "github-actions", results: [{ component: "api", ok: true, ms: 12, degraded: false }] });
});

test("main exits 0 when all is up, 1 when any component is down, and reports either way when it can", async () => {
  const lines = []; const calls = [];
  const fetchOk = async (url, init) => { calls.push([url, init?.method]); return new Response("x", { status: init?.method === "POST" ? 202 : 200 }); };
  assert.equal(await main([], { STATUS_INGEST_SECRET: "k" }, fetchOk, (l) => lines.push(l)), 0);
  assert.ok(calls.some(([u, m]) => u.endsWith("/ingest") && m === "POST"));
  assert.ok(lines.some((l) => l.startsWith("uptime: website ok")));
  lines.length = 0; calls.length = 0;
  const fetchDown = async (url, init) => (init?.method === "POST" ? new Response("ok", { status: 202 }) : new Response("x", { status: url.includes("api.") ? 502 : 200 }));
  assert.equal(await main([], { STATUS_INGEST_SECRET: "k" }, fetchDown, (l) => lines.push(l)), 1);
  assert.ok(lines.some((l) => l.startsWith("uptime: api DOWN http=502")));
  lines.length = 0;
  assert.equal(await main([], {}, fetchOk, (l) => lines.push(l)), 0);
  assert.ok(lines.some((l) => l.includes("STATUS_INGEST_SECRET is not set")));
  const unreachable = async (url, init) => { if (init?.method === "POST") throw new Error("down"); return new Response("x", { status: 200 }); };
  assert.equal(await main([], { STATUS_INGEST_SECRET: "k" }, unreachable, () => {}), 0, "the status page being down does not make the site down");
});
