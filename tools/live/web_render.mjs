// Render test: open every page of a Next.js site in Chromium and report what is broken.
//   node tools/live/web_render.mjs <baseUrl> <appDir> [identifier password loginPath]
// A page counts as broken when its document answers >= 500 (or 404 for a static route), when it throws an
// uncaught JS error, or when one of its own /api calls fails with >= 500 (4xx are listed separately:
// they are often legitimate empty/forbidden states and are reviewed by hand).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [base, appDir, identifier, password, loginPath = '/api/auth/login', prefix = ''] = process.argv.slice(2);
const pages = [];
(function walk(dir, route) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) { if (e.name === 'page.tsx') pages.push(route || '/'); continue; }
    if (e.name.startsWith('(') || e.name.startsWith('@')) { walk(path.join(dir, e.name), route); continue; }
    if (e.name === 'api' || e.name.startsWith('_')) continue;
    walk(path.join(dir, e.name), `${route}/${e.name}`);
  }
})(appDir, '');
// Next pages router (admin): every file is a route (index.tsx -> directory), except _app/_document/api
if (!pages.length) (function walkPages(dir, route) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (e.name !== 'api') walkPages(path.join(dir, e.name), `${route}/${e.name}`); continue; }
    if (!/\.tsx$/.test(e.name) || e.name.startsWith('_')) continue;
    const name = e.name.replace(/\.tsx$/, '');
    pages.push(name === 'index' ? (route || '/') : `${route}/${name}`);
  }
})(appDir, '');
const staticPages = pages.filter((p) => !p.includes('[')).map((p) => prefix + p);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ locale: 'ar-SA' });
if (process.env.COOKIES) {
  const jar = JSON.parse(fs.readFileSync(process.env.COOKIES, 'utf8'));
  await ctx.addCookies(jar.map((c) => ({ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' })));
}
if (identifier) {
  const r = await ctx.request.post(base + loginPath, { data: { identifier, password } });
  console.error('login', r.status());
}
const results = [];
for (const p of staticPages) {
  const page = await ctx.newPage();
  const res = { page: p, status: 0, jsErrors: [], api5xx: [], api4xx: [] };
  page.on('pageerror', (e) => res.jsErrors.push(String(e.message).slice(0, 160)));
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (!u.pathname.startsWith('/api/') || u.origin !== new URL(base).origin) return;
    if (r.status() >= 500) res.api5xx.push(`${r.status()} ${r.request().method()} ${u.pathname}`);
    else if (r.status() >= 400 && r.status() !== 401) res.api4xx.push(`${r.status()} ${r.request().method()} ${u.pathname}`);
  });
  try {
    const resp = await page.goto(base + p, { waitUntil: 'networkidle', timeout: 30000 });
    res.status = resp ? resp.status() : 0;
  } catch (e) {
    // live pages (polling/websocket) never go network-idle: judge them on load + a short settle instead
    try {
      const resp = await page.goto(base + p, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(4000);
      res.status = resp ? resp.status() : 0; res.live = true;
    } catch (e2) { res.status = -1; res.jsErrors.push('navigation: ' + String(e2.message).slice(0, 100)); }
  }
  await page.close();
  results.push(res);
}
await browser.close();
const broken = results.filter((r) => r.status >= 500 || r.status === 404 || r.status === -1 || r.jsErrors.length || r.api5xx.length);
fs.writeFileSync('/tmp/web_render.json', JSON.stringify(results, null, 1));
console.log(`pages ${results.length}, broken ${broken.length}`);
for (const r of broken) console.log(`BROKEN ${r.status} ${r.page} ${[...r.jsErrors, ...r.api5xx].join(' | ').slice(0, 300)}`);
for (const r of results.filter((x) => x.api4xx.length && !broken.includes(x))) console.log(`4xx ${r.page} ${[...new Set(r.api4xx)].join(' | ').slice(0, 250)}`);
