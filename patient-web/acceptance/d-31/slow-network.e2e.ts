// ACCEPTANCE — D-31 (owner decision 31, "Double taps and bad networks"): throttled 3G and an offline/online flip on the
// REAL web app (next dev) in a REAL Chromium. Written by the reviewer before the work; the implementing agent makes it
// pass and may not edit it.
//
// Flow: the pharmacy pay screen (/en/pharmacy/payment?orderId=…, server-rendered from the backend's order and
// capabilities, then the client PayScreen posts /api/payments/pharmacy/:id/intent, which the Next route forwards to the
// backend's POST /payments/intent/pharmacy/:id with the browser's Idempotency-Key).
// The backend is a tiny fake HTTP server started here (NABD_API_BASE_URL points next dev at it); it records every
// request. The browser network is throttled with CDP Network.emulateNetworkConditions (3G: 400 ms latency, ~50 KB/s).
// Rules checked:
//  A1  slow 3G + two taps on Pay (real mouse clicks at the button, whatever its state) -> the backend receives ONE
//      payment intent;
//  A2a the connection drops AFTER the backend got the request (the fake backend destroys the socket) -> the retry
//      reaches the backend with the SAME Idempotency-Key;
//  A2b offline/online flip: Pay while offline shows a clear error and the button is usable again; back online, Pay
//      reaches the backend once, and the browser sent the same key both times.
//
// Run (from patient-web; uses the preinstalled Playwright library and Chromium, never `playwright install`):
//   node --experimental-strip-types acceptance/d-31/slow-network.e2e.ts
// Exit code 0 = all rules hold; 1 = a rule failed (the failures are printed); 2 = setup failed.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";

const require = createRequire(import.meta.url);
const PLAYWRIGHT = process.env.PLAYWRIGHT_LIB ?? "/opt/node-tools/node_modules/playwright";
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require(PLAYWRIGHT) as typeof import("playwright");

const WEB_DIR = resolve(import.meta.dirname, "../..");
const WEB_PORT = Number(process.env.D31_WEB_PORT ?? 3931);
const ORDER = "761e9693-e517-4ad6-ae20-330363005b28";
const THREE_G = { offline: false, latency: 400, downloadThroughput: (50 * 1024), uploadThroughput: (50 * 1024) };

/* ---------------------------------------------------------------------------------------------------------------- */
/* The fake backend                                                                                                  */
/* ---------------------------------------------------------------------------------------------------------------- */

type Seen = { method: string; path: string; key: string | null; at: number };
type IntentMode = "slow-then-409" | "drop-then-hang" | "hang";
const backend = { seen: [] as Seen[], intentMode: "hang" as IntentMode, intents: 0 };
const intentSeen = () => backend.seen.filter((s) => s.method === "POST" && /\/payments\/intent\/pharmacy\//.test(s.path));

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const path = (req.url ?? "/").split("?")[0].replace(/^\/api\/v1/, "");
  const key = (req.headers["idempotency-key"] as string | undefined) ?? null;
  backend.seen.push({ method: req.method ?? "GET", path, key, at: Date.now() });
  req.resume();
  if (req.method === "GET" && path === `/patient/pharmacy/orders/${ORDER}`) return send(res, 200, { id: ORDER, status: "awaiting_payment", governed_state: "FINAL_QUOTE_ACCEPTED", payment_status: "pending", coverage_mode: "cash", accepted_quote_snapshot: { totals: { subtotal: 41.5, delivery_fee: 10, total: 51.5, currency: "SAR" } } });
  if (req.method === "GET" && path === `/payments/pharmacy/${ORDER}/capabilities`) return send(res, 200, { booking_id: ORDER, amount: 51.5, currency: "SAR", methods: [{ id: "card", kind: "online" }] });
  if (req.method === "POST" && path === `/payments/intent/pharmacy/${ORDER}`) {
    backend.intents += 1;
    if (backend.intentMode === "slow-then-409") { setTimeout(() => send(res, 409, { message: "payment_order_not_collectable" }), 4000); return; }
    if (backend.intentMode === "drop-then-hang") {
      if (backend.intents === 1) { req.socket.destroy(); return; } // the server got it; the answer never comes back
      return; // the retry: keep it open, we only look at what it carried
    }
    return; // hang
  }
  return send(res, 404, { message: "not_in_test" });
});

/* ---------------------------------------------------------------------------------------------------------------- */
/* next dev                                                                                                          */
/* ---------------------------------------------------------------------------------------------------------------- */

function withoutAgentEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const copy = { ...env };
  for (const name of ["AI_AGENT", "CLAUDECODE", "CLAUDE_CODE", "CLAUDE_CODE_IS_COWORK", "CURSOR_TRACE_ID", "CURSOR_AGENT", "GEMINI_CLI", "CODEX_SANDBOX", "CODEX_CI", "CODEX_THREAD_ID", "OPENCODE_CLIENT", "AUGMENT_AGENT", "ANTIGRAVITY_AGENT", "REPL_ID"]) delete copy[name];
  return copy;
}

async function startNext(apiBase: string): Promise<ChildProcess> {
  const child = spawn("npx", ["next", "dev", "-p", String(WEB_PORT), "-H", "127.0.0.1"], {
    cwd: WEB_DIR,
    // AI_AGENT/CLAUDECODE make next dev write AGENTS.md/CLAUDE.md into the app: not in a test run
    env: { ...withoutAgentEnv(process.env), NABD_API_BASE_URL: apiBase, INTERNAL_API_BASE_URL: apiBase, NEXT_TELEMETRY_DISABLED: "1", PORT: String(WEB_PORT) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let log = "";
  child.stdout?.on("data", (d) => { log += String(d); });
  child.stderr?.on("data", (d) => { log += String(d); });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next dev exited (${child.exitCode}):\n${log.slice(-3000)}`);
    try {
      const r = await fetch(`http://127.0.0.1:${WEB_PORT}/en`, { redirect: "manual" });
      if (r.status > 0) return child;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`next dev did not start in 180 s:\n${log.slice(-3000)}`);
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* The checks                                                                                                        */
/* ---------------------------------------------------------------------------------------------------------------- */

const failures: string[] = [];
const pageErrors: string[] = [];
const navigations: string[] = [];
const browserLog: string[] = [];
const passes: string[] = [];
function check(name: string, ok: boolean, detail: string) {
  (ok ? passes : failures).push(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
}

async function main() {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const nextEnvPath = resolve(WEB_DIR, "next-env.d.ts");
  const nextEnv = readFileSync(nextEnvPath, "utf8");
  process.on("exit", () => { try { writeFileSync(nextEnvPath, nextEnv); } catch { /* keep going */ } });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const apiBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  let next: ChildProcess | null = null;
  let browser: import("playwright").Browser | null = null;
  try {
    next = await startNext(apiBase);
    browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  } catch (error) {
    console.error(`SETUP FAILED: ${(error as Error).message}`);
    if (next?.pid) try { process.kill(-next.pid, "SIGTERM"); } catch { /* gone */ }
    server.close();
    process.exit(2);
  }
  const base = `http://127.0.0.1:${WEB_PORT}`;
  // compile the page once before timing anything (next dev compiles on first request)
  try {
    await fetch(`${base}/en/pharmacy/payment?orderId=${ORDER}`, { headers: { cookie: "nabd_access=d31-test-access-token" }, signal: AbortSignal.timeout(240_000) });
    // and the payment route (an invalid body: answered 400 by the route itself, nothing reaches the backend)
    await fetch(`${base}/api/payments/pharmacy/${ORDER}/intent`, { method: "POST", headers: { cookie: "nabd_access=d31-test-access-token", "idempotency-key": "d31-warmup-key-000000", "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(240_000) });
  } catch (error) {
    console.error(`SETUP FAILED: the payment page did not compile: ${(error as Error).message}`);
  }
  try {
    const open = async () => {
      const context = await browser!.newContext({ locale: "en-US", viewport: { width: 390, height: 844 } });
      await context.addCookies([{ name: "nabd_access", value: "d31-test-access-token", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      const browserKeys: string[] = [];
      page.on("request", (request) => {
        if (request.method() === "POST" && /\/api\/payments\/pharmacy\/[^/]+\/intent$/.test(new URL(request.url()).pathname)) {
          browserKeys.push(request.headers()["idempotency-key"] ?? "");
          browserLog.push(`${Date.now()} browser POST intent key=${request.headers()["idempotency-key"]}`);
        }
      });
      page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text().slice(0, 300)); });
      page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
      await page.goto(`${base}/en/pharmacy/payment?orderId=${ORDER}`, { waitUntil: "load", timeout: 180_000 });
      // the button changes its label while it works ("Taking you to the secure page…"): match both
      const pay = page.getByRole("button", { name: /^Pay\b|Taking you to the secure page/ }).last();
      await pay.waitFor({ state: "visible", timeout: 60_000 });
      await page.waitForTimeout(3000); // hydrated and idle: the taps below are taps on the live page
      return { context, page, cdp, pay, browserKeys };
    };
    /** a real tap at the button's place, whether or not the button is disabled (like a finger) */
    const tapAt = async (page: import("playwright").Page, locator: import("playwright").Locator) => {
      const box = await locator.boundingBox({ timeout: 2000 });
      if (!box) throw new Error("pay button has no box");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    };
    /** a message with text in it (Next's empty route announcer is also role=alert) */
    const alertText = async (page: import("playwright").Page, timeout: number) => {
      const alert = page.locator('[role="alert"]', { hasText: /\S/ }).first();
      await alert.waitFor({ timeout }).catch(() => undefined);
      return (await page.locator('[role="alert"]', { hasText: /\S/ }).allTextContents()).join(" | ");
    };

    // A1: throttled 3G, two taps
    {
      backend.seen = []; backend.intents = 0; backend.intentMode = "slow-then-409";
      const { context, page, cdp, pay } = await open();
      await cdp.send("Network.emulateNetworkConditions", THREE_G);
      browserLog.push(`${Date.now()} A1 tap 1`);
      await tapAt(page, pay);
      await page.waitForTimeout(150);
      const disabledDuring = await pay.isDisabled({ timeout: 1000 });
      browserLog.push(`${Date.now()} A1 tap 2 (button disabled: ${disabledDuring})`);
      check("A1 3G: the Pay button is disabled while the request is in flight", disabledDuring, "the Pay button is enabled 150 ms after the first tap");
      await tapAt(page, pay);
      await page.waitForTimeout(6000);
      check("A1 3G double tap -> one payment intent at the backend", intentSeen().length === 1, `${intentSeen().length} intents reached the backend (keys: ${intentSeen().map((s) => s.key).join(" , ")})`);
      await context.close();
    }

    // A2a: the connection drops after the backend got the request
    {
      backend.seen = []; backend.intents = 0; backend.intentMode = "drop-then-hang";
      const { context, page, cdp, pay } = await open();
      await cdp.send("Network.emulateNetworkConditions", THREE_G);
      await tapAt(page, pay);
      const message = await alertText(page, 30_000);
      check("A2a a clear message after the dropped connection", message.trim().length > 0, "no role=alert message on the page");
      await page.waitForTimeout(500);
      await tapAt(page, pay);
      await page.waitForTimeout(5000);
      const seen = intentSeen();
      check("A2a the retry reaches the backend with the SAME Idempotency-Key", seen.length >= 2 && seen[0].key === seen[1].key, seen.length < 2 ? `only ${seen.length} intent(s) reached the backend` : `two different keys sent: ${seen[0].key} vs ${seen[1].key}`);
      await context.close();
    }

    // A2b: offline -> Pay -> error, then online -> Pay
    {
      backend.seen = []; backend.intents = 0; backend.intentMode = "hang";
      const { context, page, cdp, pay, browserKeys } = await open();
      await cdp.send("Network.emulateNetworkConditions", { ...THREE_G, offline: true });
      await context.setOffline(true);
      await tapAt(page, pay);
      const message = await alertText(page, 15_000);
      check("B offline Pay shows a clear error", message.trim().length > 0, "no role=alert message after paying offline");
      check("B offline: the Pay button is usable again", !(await pay.isDisabled()), "the Pay button stayed disabled after the offline failure");
      check("B offline: nothing reached the backend", intentSeen().length === 0, `${intentSeen().length} intents reached the backend while offline`);
      await context.setOffline(false);
      await cdp.send("Network.emulateNetworkConditions", THREE_G);
      await tapAt(page, pay);
      await page.waitForTimeout(5000);
      check("A2b online again: the payment reaches the backend once", intentSeen().length === 1, `${intentSeen().length} intents reached the backend`);
      check("A2b the browser sent the SAME key offline and online", browserKeys.length >= 2 && browserKeys[0] === browserKeys[1], `browser keys: ${browserKeys.join(" , ")}`);
      await context.close();
    }
  } catch (error) {
    failures.push(`FAIL (error) ${(error as Error).message}`);
  } finally {
    await browser?.close();
    if (next?.pid) try { process.kill(-next.pid, "SIGTERM"); } catch { /* gone */ }
    server.close();
  }
  for (const line of [...passes, ...failures]) console.log(line);
  if (process.env.D31_DEBUG) console.log({ browserLog, pageErrors: pageErrors.filter((e) => !/Content Security Policy/.test(e)), navigations, backend: backend.seen.filter((x) => x.method !== "GET") });
  process.exit(failures.length ? 1 : 0);
}

void main();
