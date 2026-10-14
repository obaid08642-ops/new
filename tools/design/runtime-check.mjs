#!/usr/bin/env node
/**
 * Runtime check for the web screens of a batch (docs/design/QUALITY_STANDARDS.md, "Runtime check").
 *
 * Opens every static route of the batch against a running patient-web that talks to a SEEDED backend and
 * records, per route and per scenario:
 *
 *   normal   signed in (or anonymous for the public auth pages) with the real backend responses
 *   empty    every browser-side /api/** GET answered 200 with an empty list
 *   error    every browser-side /api/** GET answered 500
 *
 * For each scenario it records the browser's /api/** requests (method, path, status, shape of the body), the
 * calls the SERVER made on the page's behalf (read from the backend's HTTP log, so a server-rendered fetch is
 * not invisible), console errors, uncaught page errors, the Next error overlay, and whether the page
 * rendered any text. It never mutates data: only GET requests are intercepted, and the script clicks nothing.
 *
 *   node tools/design/runtime-check.mjs --base http://localhost:3100 --backend-log /path/backend.log \
 *        --batch 0 --out docs/design/audit/runtime-batch-0-web.md
 *
 * Needs Playwright (PLAYWRIGHT_BROWSERS_PATH is preconfigured in the cloud environment; NODE_PATH may need
 * to include /opt/node-tools/node_modules).
 */
import { readFileSync, writeFileSync, statSync, mkdirSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require('playwright'); } catch { return require('/opt/node-tools/node_modules/playwright'); }
})();

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg('base', 'http://localhost:3100');
const BACKEND_LOG = arg('backend-log');
const BATCH = arg('batch', '0');
const LOCALE = arg('locale', 'ar');
const OUT = resolve(REPO, arg('out', `docs/design/audit/runtime-batch-${BATCH}-web.md`));
const SHOTS = join(dirname(OUT), 'runtime', `batch-${BATCH}-web`);
const FAULT = arg('fault-control'); // e.g. http://localhost:3003/__fault (tools/design/fault-proxy.mjs): server-side empty/error
const IDENTIFIER = arg('identifier', '+966509999999');
const PASSWORD = arg('password', 'Test@123');
const PUBLIC = /^\/(welcome|login|register|otp|forgot-password|password-reset|onboarding(\/.*)?)$/;

const screens = JSON.parse(readFileSync(join(REPO, 'docs/design/inventory/screens.json'), 'utf8')).routes;
// --only /a,/b limits the run to those routes (a slice of a batch); --extra /c,/p/x adds routes the batch lists with a
// dynamic segment, written with a concrete value (the tool opens static routes only).
const ONLY = arg('only') ? arg('only').split(',') : null;
const EXTRA = arg('extra') ? arg('extra').split(',') : [];
const routes = [...screens
  .filter((r) => r.app === 'patient-web' && String(r.batch).replace(/\D/g, '') === String(BATCH) && !r.route.includes('['))
  .map((r) => r.route), ...EXTRA]
  .filter((r) => !ONLY || ONLY.includes(r) || EXTRA.includes(r))
  .filter((r, i, a) => a.indexOf(r) === i);

const logSize = () => (BACKEND_LOG ? statSync(BACKEND_LOG).size : 0);
const logSince = (from) => {
  if (!BACKEND_LOG) return [];
  const to = statSync(BACKEND_LOG).size;
  if (to <= from) return [];
  const fd = openSync(BACKEND_LOG, 'r');
  const buf = Buffer.alloc(to - from);
  readSync(fd, buf, 0, to - from, from);
  closeSync(fd);
  const calls = [];
  // eslint-disable-next-line no-control-regex
  for (const line of buf.toString('utf8').replace(/\u001b\[[0-9;]*m/g, '').split('\n')) {
    const m = line.match(/\] (GET|POST|PUT|PATCH|DELETE) (\/api\/\S+) (\d{3}) /);
    if (m && !m[2].includes('/health/')) calls.push({ method: m[1], path: m[2].split('?')[0], status: Number(m[3]) });
  }
  return calls;
};

const shape = (text) => {
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j)) return `array(${j.length})`;
    if (j && typeof j === 'object') {
      const keys = Object.keys(j);
      const lens = keys.filter((k) => Array.isArray(j[k])).map((k) => `${k}[${j[k].length}]`);
      return `object{${keys.slice(0, 6).join(',')}${keys.length > 6 ? ',…' : ''}}${lens.length ? ' ' + lens.join(' ') : ''}`;
    }
    return typeof j;
  } catch {
    return 'non-json';
  }
};

async function run() {
  const browser = await chromium.launch();
  const results = [];

  const signedInState = await (async () => {
    const ctx = await browser.newContext();
    const res = await ctx.request.post(`${BASE}/api/auth/login`, { data: { identifier: IDENTIFIER, password: PASSWORD } });
    if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
    const state = await ctx.storageState();
    await ctx.close();
    return state;
  })();

  for (const route of routes) {
    for (const scenario of ['normal', 'empty', 'error']) {
      for (const session of PUBLIC.test(route) ? ['anonymous'] : ['signed-in']) {
        const ctx = await browser.newContext({
          viewport: { width: 390, height: 844 },
          storageState: session === 'signed-in' ? signedInState : undefined,
        });
        const page = await ctx.newPage();
        const api = [];
        const consoleErrors = [];
        const pageErrors = [];
        const failed = [];

        if (FAULT) await fetch(`${FAULT}/${scenario === 'normal' ? 'pass' : scenario}`, { method: 'POST' });
        if (scenario !== 'normal' && !FAULT) {
          await page.route(/\/api\/(?!auth\/)/, (r) => {
            if (r.request().method() !== 'GET') return r.continue();
            if (!r.request().url().startsWith(BASE)) return r.continue();
            return scenario === 'empty'
              ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
              : r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"runtime-check injected failure"}' });
          });
        }
        page.on('response', async (res) => {
          const u = new URL(res.url());
          if (u.origin !== new URL(BASE).origin || !u.pathname.startsWith('/api/')) return;
          let body = '';
          try { body = await res.text(); } catch { /* streamed */ }
          api.push({ method: res.request().method(), path: u.pathname, status: res.status(), shape: shape(body) });
        });
        // CSP violations are collected from the browser event so their source file is known: the Next dev
        // overlay (next-devtools) injects inline styles by design and is not the app's, so it is ignored.
        await page.addInitScript(() => {
          window.__csp = [];
          document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.sourceFile || ''}:${e.lineNumber} ${e.sample || ''}`.trim()));
        });
        page.on('console', (m) => { if (m.type() === 'error' && !/Content Security Policy/.test(m.text())) consoleErrors.push(m.text().slice(0, 200)); });
        page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
        page.on('requestfailed', (r) => failed.push(`${r.method()} ${new URL(r.url()).pathname} ${r.failure()?.errorText}`));

        const from = logSize();
        let status = 0;
        let finalPath = '';
        try {
          const nav = await page.goto(`${BASE}/${LOCALE}${route === '/' ? '' : route}`, { waitUntil: 'load', timeout: 45000 });
          status = nav?.status() ?? 0;
          // `networkidle` never arrives on a signed-in page (the session heartbeat), so settle on a fixed wait.
          await page.waitForTimeout(2500);
          finalPath = new URL(page.url()).pathname;
        } catch (e) {
          pageErrors.push(`navigation: ${String(e).slice(0, 160)}`);
        }
        const overlay = await page.evaluate(() => {
          // Next's dev overlay host always exists; an error is a dialog inside its shadow root.
          const root = document.querySelector('nextjs-portal')?.shadowRoot;
          return root && root.querySelector('[data-nextjs-dialog], [data-nextjs-dialog-overlay]') ? 1 : 0;
        }).catch(() => 0);
        const csp = (await page.evaluate(() => window.__csp || []).catch(() => [])).filter((v) => !v.includes('next-devtools'));
        for (const v of csp) consoleErrors.push(`CSP: ${v}`.slice(0, 200));
        const textLen = await page.evaluate(() => (document.body.innerText || '').trim().length).catch(() => 0);
        const server = scenario === 'normal' ? logSince(from) : [];
        if (scenario !== 'normal') {
          mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: join(SHOTS, `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}-${scenario}.png`) }).catch(() => {});
        }
        results.push({ route, scenario, session, status, finalPath, api, server, consoleErrors, pageErrors, failed, overlay, textLen });
        await ctx.close();
        if (FAULT) await fetch(`${FAULT}/pass`, { method: 'POST' });
        process.stdout.write(`${scenario.padEnd(6)} ${session.padEnd(10)} ${route} -> ${status} ${finalPath} api=${api.length} srv=${server.length} err=${pageErrors.length + consoleErrors.length}\n`);
      }
    }
  }
  await browser.close();
  return results;
}

// --render-only: rebuild the report from the JSON of the last run (no browser).
const results = process.argv.includes('--render-only') ? JSON.parse(readFileSync(OUT.replace(/\.md$/, '.json'), 'utf8')) : await run();

const bad = (r) => {
  const issues = [];
  if (r.status >= 400 || r.status === 0) issues.push(`document ${r.status}`);
  if (r.overlay) issues.push('Next error overlay');
  if (r.pageErrors.length) issues.push(`${r.pageErrors.length} uncaught error(s)`);
  if (r.textLen < 10) issues.push('blank page');
  // Console errors must be 0 with real or empty data; the error scenario's own injected 500s legitimately log.
  if (r.scenario !== 'error' && r.consoleErrors.length) issues.push(`${[...new Set(r.consoleErrors)].length} distinct console error(s)`);
  if (r.scenario === 'normal') {
    for (const c of [...r.api, ...r.server]) if (c.status >= 400) issues.push(`${c.method} ${c.path} -> ${c.status}`);
  }
  return issues;
};

let md = `# Runtime check, Batch ${BATCH} (patient-web)\n\n`;
md += `Generated by \`node tools/design/runtime-check.mjs\` against ${BASE} (locale \`${LOCALE}\`, 390 px) talking to a seeded backend.\n`;
md += `Scenarios: **normal** = real responses; **empty** = every data GET answered \`200 []\`; **error** = every data GET answered \`500\`. ${FAULT ? 'Injected by \`tools/design/fault-proxy.mjs\` between patient-web and the backend, so server-rendered fetches are covered too.' : 'Injected in the browser only (no fault proxy), so server-rendered fetches are NOT covered.'}\n`;
md += `Server-rendered fetches are not visible to the browser, so for the normal scenario the backend's HTTP log is read as well (listed as "Server" below).\n\n`;
md += `| Route | Session | Normal | Empty | Error |\n|---|---|---|---|---|\n`;
for (const route of routes) {
  const rs = results.filter((r) => r.route === route);
  const cell = (s) => {
    const r = rs.find((x) => x.scenario === s);
    if (!r) return '';
    const i = bad(r);
    return i.length ? `FAIL: ${i.join('; ')}` : `ok (${r.status}${r.finalPath && r.finalPath !== `/${LOCALE}${route === '/' ? '' : route}` ? ` → ${r.finalPath}` : ''})`;
  };
  md += `| \`${route}\` | ${rs[0]?.session} | ${cell('normal')} | ${cell('empty')} | ${cell('error')} |\n`;
}
md += `\n## Requests per route (normal scenario)\n\n`;
for (const r of results.filter((x) => x.scenario === 'normal')) {
  md += `### \`${r.route}\` (${r.session}) → ${r.status} ${r.finalPath}\n\n`;
  if (!r.api.length && !r.server.length) md += `No API request: the screen is static (or redirected before fetching).\n\n`;
  if (r.api.length) md += `Browser:\n${r.api.map((c) => `- ${c.method} \`${c.path}\` → ${c.status} · ${c.shape}`).join('\n')}\n\n`;
  if (r.server.length) md += `Server (backend log):\n${r.server.map((c) => `- ${c.method} \`${c.path}\` → ${c.status}`).join('\n')}\n\n`;
  if (r.consoleErrors.length) md += `Console errors:\n${[...new Set(r.consoleErrors)].map((c) => `- ${c}`).join('\n')}\n\n`;
  if (r.failed.length) md += `Failed requests:\n${[...new Set(r.failed)].map((c) => `- ${c}`).join('\n')}\n\n`;
}
md += `## Failures\n\n`;
const fails = results.filter((r) => bad(r).length);
md += fails.length ? fails.map((r) => `- \`${r.route}\` ${r.scenario}: ${bad(r).join('; ')}`).join('\n') : 'None.';
md += '\n';
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, md, 'utf8');
writeFileSync(OUT.replace(/\.md$/, '.json'), JSON.stringify(results, null, 1) + '\n', 'utf8');
console.log(`runtime-check: ${results.length} run(s), ${fails.length} with issues -> ${OUT}`);
process.exit(fails.length ? 1 : 0);
