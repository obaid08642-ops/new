#!/usr/bin/env node
/**
 * Navigation timing inside the site (F82-2, plan target: the next page is visible in < 200 ms).
 *
 * Runs against a PRODUCTION build (standalone server), in Chromium, with CPU throttling x4 and a network profile
 * applied through the DevTools protocol (`--net fast4g` default: 9 Mbps down, 1.5 Mbps up, 150 ms RTT;
 * `--net slow4g`: 1.6 Mbps, 750 Kbps, 150 ms RTT, the Lighthouse mobile profile; `--net none`: no network throttling).
 * Both throttles are printed in the output header, so a number never travels without its conditions.
 *
 *   cd patient-web && pnpm build && cp -r .next/static .next/standalone/.next/static
 *   PORT=3010 HOSTNAME=127.0.0.1 NABD_API_BASE_URL=<seeded backend> node .next/standalone/server.js &
 *   NODE_PATH=/opt/node-tools/node_modules node tools/design/nav-timing.mjs --base http://localhost:3010 \
 *     --tag base --runs 5 --out /tmp/nav-base.json
 *   node tools/design/nav-timing.mjs --table /tmp/nav-base.json /tmp/nav-after.json   # side by side, markdown
 *
 * DEFINITION (the only one used): click-to-visible = the time from the `click` event on the link (the first thing a
 * capture-phase listener sees, `event.timeStamp`) to the first animation frame in which (a) `location.pathname` is the
 * destination, (b) the destination's `h1` is in the DOM with a non-zero box, and (c) no element is `aria-busy="true"`
 * (the route loading fallback is aria-busy and has no h1). It is taken inside the page, so it is the same for a client
 * transition and for a full document load (the start time then travels in sessionStorage). Resolution: one frame, 16 ms.
 *
 * CONDITIONS per link, each in a fresh page load (nothing carried over, no HTTP cache, no router cache):
 *   cold      click as soon as React has hydrated the link (its `__reactProps$` key exists), nothing else waited for
 *   viewport  wait until the network has been quiet for 1.5 s and at least 4 s have passed since `load` (the prefetches
 *             of the links in the viewport, including the ones the page starts when idle, are done), then click. Phone viewports use a real tap (touchstart, then click); desktop uses the mouse
 *   hover     (desktop only) as `viewport`, then move the mouse onto the link, wait 250 ms (a typical dwell), click
 * The median of `--runs` (default 5) is reported, with min and max.
 *
 * `--prefetch-cost` instead loads `/ar` per viewport and reports what the page fetches AFTER `load` until the network is
 * quiet: the RSC prefetch requests (count, bytes) and everything else, so the owner sees what prefetching costs.
 *
 * What this cannot say: a real phone's CPU and radio, edge TTFB, INP, repeat visits, signed-in pages (the run is
 * anonymous), and anything for pages whose data the seeded backend does not have (see the audit's "not measured").
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(`--${n}`);

const NETS = {
  fast4g: { latency: 150, downloadThroughput: (9 * 1000 * 1000) / 8, uploadThroughput: (1.5 * 1000 * 1000) / 8, label: 'Fast 4G: 9 Mbps down, 1.5 Mbps up, 150 ms RTT' },
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1000 * 1000) / 8, uploadThroughput: (750 * 1000) / 8, label: 'Slow 4G (Lighthouse mobile): 1.6 Mbps down, 750 Kbps up, 150 ms RTT' },
  none: null,
};
const CPU = 4;

/** The tab bar order of the shell (home, pharmacy, consult (raised), labs, nursing). */
const tab = (i) => `nav.nabd-bottom-tab-bar > button:nth-of-type(${i})`;
const link = (href) => `a[href="${href}"]:visible`;

const PHONE = { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { name: 'desktop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false };

/** id, device, page to start from, element to click, the destination path whose h1 must show. */
const LINKS = [
  { id: 'home-tile-doctors', device: PHONE, from: '/ar', sel: link('/ar/consultations/doctors'), dest: '/ar/consultations/doctors', conds: ['cold', 'viewport'] },
  { id: 'home-tile-pharmacy', device: PHONE, from: '/ar', sel: link('/ar/c'), dest: '/ar/c', conds: ['cold', 'viewport'] },
  { id: 'home-tile-labs', device: PHONE, from: '/ar', sel: link('/ar/diagnostics'), dest: '/ar/diagnostics', conds: ['cold', 'viewport'] },
  { id: 'home-tile-nursing', device: PHONE, from: '/ar', sel: link('/ar/nursing/catalog'), dest: '/ar/nursing/catalog', conds: ['cold', 'viewport'] },
  { id: 'tabbar-doctors', device: PHONE, from: '/ar', sel: tab(3), dest: '/ar/consultations/doctors', conds: ['cold', 'viewport'] },
  { id: 'tabbar-pharmacy', device: PHONE, from: '/ar', sel: tab(2), dest: '/ar/c', conds: ['cold', 'viewport'] },
  { id: 'tabbar-labs', device: PHONE, from: '/ar', sel: tab(4), dest: '/ar/diagnostics', conds: ['cold', 'viewport'] },
  { id: 'nav-doctors', device: DESKTOP, from: '/ar', sel: `nav a[href="/ar/consultations/doctors"]:visible`, dest: '/ar/consultations/doctors', conds: ['cold', 'viewport', 'hover'] },
  { id: 'nav-pharmacy', device: DESKTOP, from: '/ar', sel: `nav a[href="/ar/c"]:visible`, dest: '/ar/c', conds: ['cold', 'viewport', 'hover'] },
  { id: 'nav-labs', device: DESKTOP, from: '/ar', sel: `nav a[href="/ar/diagnostics"]:visible`, dest: '/ar/diagnostics', conds: ['cold', 'viewport', 'hover'] },
];

const INIT = () => {
  const ss = sessionStorage;
  document.addEventListener('click', (e) => {
    if (ss.getItem('__arm') === '1') {
      ss.setItem('__t0', String(performance.timeOrigin + e.timeStamp));
      ss.setItem('__arm', '0');
      ss.setItem('__go', '1');
    }
  }, true);
  const tick = () => {
    if (ss.getItem('__go') === '1') {
      const dest = ss.getItem('__dest');
      const h1 = location.pathname === dest ? document.querySelector('h1') : null;
      if (h1 && h1.getBoundingClientRect().height > 0 && !document.querySelector('[aria-busy="true"]')) {
        ss.setItem('__go', '0');
        const t1 = performance.timeOrigin + performance.now();
        ss.setItem('__res', String(Math.round(t1 - Number(ss.getItem('__t0')))));
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

async function setup(browser, device, netKey) {
  const ctx = await browser.newContext({ viewport: device.viewport, deviceScaleFactor: device.deviceScaleFactor, isMobile: device.isMobile, hasTouch: device.hasTouch, locale: 'ar' });
  const page = await ctx.newPage();
  await page.addInitScript(INIT);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const net = NETS[netKey];
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: net.downloadThroughput, uploadThroughput: net.uploadThroughput });
  let inflight = 0; let lastActivity = Date.now();
  page.on('request', () => { inflight++; lastActivity = Date.now(); });
  const done = () => { inflight = Math.max(0, inflight - 1); lastActivity = Date.now(); };
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  const idle = async (quietMs = 1500, maxMs = 25000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (inflight === 0 && Date.now() - lastActivity >= quietMs) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  return { ctx, page, idle };
}

async function oneRun(browser, spec, cond, netKey, base) {
  const { ctx, page, idle } = await setup(browser, spec.device, netKey);
  try {
    await page.goto(base + spec.from, { waitUntil: 'load', timeout: 60000 });
    const loadedAt = Date.now();
    const target = page.locator(spec.sel).first();
    await target.waitFor({ state: 'visible', timeout: 30000 });
    // The element handle's own props must show React has hydrated it (a click before that is a full page load).
    for (let i = 0; i < 100; i++) {
      const hydrated = await target.evaluate((el) => Object.keys(el).some((k) => k.startsWith('__reactProps$')));
      if (hydrated) break;
      await page.waitForTimeout(50);
    }
    if (cond !== 'cold') {
      // Quiet network, and at least 4 s after `load`: the page's own idle-time prefetch (up to 3 s after load) has then started and finished.
      await idle();
      await page.waitForTimeout(Math.max(0, 4000 - (Date.now() - loadedAt)));
      await idle();
    }
    if (cond === 'hover') { await target.hover(); await page.waitForTimeout(250); }
    await page.evaluate((dest) => { sessionStorage.removeItem('__res'); sessionStorage.setItem('__dest', dest); sessionStorage.setItem('__arm', '1'); window.__docMarker = 1; }, spec.dest);
    if (spec.device.hasTouch) await target.tap(); else await target.click();
    const t = await page.waitForFunction(() => sessionStorage.getItem('__res'), null, { timeout: 20000, polling: 20 }).then((h) => h.jsonValue()).catch(() => null);
    const soft = await page.evaluate(() => window.__docMarker === 1).catch(() => false);
    return { ms: t == null ? null : Number(t), soft };
  } finally {
    await ctx.close();
  }
}

async function prefetchCost(browser, netKey, base, runs) {
  const out = [];
  for (const device of [PHONE, DESKTOP]) {
    const samples = [];
    for (let r = 0; r < runs; r++) {
      const { ctx, page, idle } = await setup(browser, device, netKey);
      const reqs = [];
      let loaded = false;
      page.on('load', () => { loaded = true; });
      page.on('requestfinished', async (req) => {
        if (!loaded) return;
        const s = await req.sizes().catch(() => null);
        const h = req.headers();
        reqs.push({
          url: req.url(),
          rsc: h['rsc'] === '1',
          prefetch: h['next-router-prefetch'] === '1' || h['next-router-segment-prefetch'] !== undefined,
          type: req.resourceType(),
          bytes: s ? s.responseBodySize + s.responseHeadersSize : 0,
        });
      });
      await page.goto(base + '/ar', { waitUntil: 'load', timeout: 60000 });
      await idle(2500, 40000);
      const rscReqs = reqs.filter((q) => q.rsc);
      samples.push({
        rscCount: rscReqs.length,
        rscBytes: rscReqs.reduce((a, q) => a + q.bytes, 0),
        otherCount: reqs.length - rscReqs.length,
        otherBytes: reqs.filter((q) => !q.rsc).reduce((a, q) => a + q.bytes, 0),
        urls: rscReqs.map((q) => new URL(q.url).pathname),
      });
      await ctx.close();
    }
    out.push({ device: device.name, runs: samples });
  }
  return out;
}

function table(files) {
  const data = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const tags = data.map((d) => d.tag);
  const lines = [];
  lines.push(`| link | condition | ${tags.map((t) => `${t} median (min..max) ms`).join(' | ')} |`);
  lines.push(`|---|---|${tags.map(() => '---|').join('')}`);
  const ids = [...new Set(data.flatMap((d) => d.results.map((r) => `${r.id}|${r.cond}`)))];
  for (const k of ids) {
    const [id, cond] = k.split('|');
    const cells = data.map((d) => {
      const r = d.results.find((x) => x.id === id && x.cond === cond);
      if (!r) return 'n/a';
      const ok = r.samples.filter((x) => x != null);
      if (!ok.length) return 'no result';
      return `**${median(ok)}** (${Math.min(...ok)}..${Math.max(...ok)})${r.hard ? ` hard-nav x${r.hard}` : ''}`;
    });
    lines.push(`| ${id} | ${cond} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

if (flag('table')) {
  const files = process.argv.slice(process.argv.indexOf('--table') + 1).filter((a) => !a.startsWith('--'));
  console.log(table(files));
  process.exit(0);
}

const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node-tools/node_modules/playwright'); } })();
const BASE = arg('base', 'http://localhost:3010');
const RUNS = Number(arg('runs', '5'));
const TAG = arg('tag', 'run');
const NET = arg('net', 'fast4g');
const OUT = arg('out', `/tmp/nav-${TAG}.json`);
const ONLY = arg('only', '');
const header = `tag=${TAG} base=${BASE} cpu=x${CPU} net=${NETS[NET] ? NETS[NET].label : 'none'} runs=${RUNS}`;
console.log(header);

const browser = await chromium.launch();
if (flag('prefetch-cost')) {
  const res = await prefetchCost(browser, NET, BASE, RUNS);
  for (const d of res) {
    const m = (k) => median(d.runs.map((r) => r[k]));
    console.log(`${d.device}: after load until quiet, /ar: RSC prefetch requests ${m('rscCount')}, ${(m('rscBytes') / 1024).toFixed(1)} KB (headers+compressed body); other requests ${m('otherCount')}, ${(m('otherBytes') / 1024).toFixed(1)} KB`);
    console.log('  RSC urls (run 1): ' + d.runs[0].urls.join(' '));
  }
  writeFileSync(OUT, JSON.stringify({ tag: TAG, header, prefetchCost: res }, null, 1));
  await browser.close();
  process.exit(0);
}

const results = [];
for (const spec of LINKS) {
  if (ONLY && !ONLY.split(',').includes(spec.id)) continue;
  for (const cond of spec.conds) {
    const samples = []; let hard = 0;
    for (let i = 0; i < RUNS; i++) {
      try {
        const r = await oneRun(browser, spec, cond, NET, BASE);
        samples.push(r.ms);
        if (!r.soft) hard++;
      } catch (e) {
        samples.push(null);
        console.error(`  ${spec.id}/${cond} run ${i + 1}: ${String(e.message).split('\n')[0]}`);
      }
    }
    const ok = samples.filter((x) => x != null);
    console.log(`${spec.id.padEnd(22)} ${cond.padEnd(9)} ${ok.length ? `median ${median(ok)} ms (min ${Math.min(...ok)}, max ${Math.max(...ok)})` : 'no result'}  [${samples.join(', ')}]${hard ? `  hard-navigations: ${hard}` : ''}`);
    results.push({ id: spec.id, device: spec.device.name, cond, samples, hard });
  }
}
writeFileSync(OUT, JSON.stringify({ tag: TAG, header, results }, null, 1));
await browser.close();
