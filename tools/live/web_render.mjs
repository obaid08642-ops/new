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

let browser, ctx;
async function openBrowser() {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--disable-dev-shm-usage'] });
  ctx = await browser.newContext({ locale: 'ar-SA' });
  if (process.env.COOKIES) {
    const jar = JSON.parse(fs.readFileSync(process.env.COOKIES, 'utf8'));
    await ctx.addCookies(jar.map((c) => ({ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' })));
  }
  if (identifier) {
    const r = await ctx.request.post(base + loginPath, { data: { identifier, password } });
    if (!results.length) console.error('login', r.status());
  }
}
const results = [];
async function visit(p) {
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
    const resp = await page.goto(base + p, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500); // let client-side data calls land
    res.status = resp ? resp.status() : 0;
  } catch (e) { res.status = -1; res.jsErrors.push('navigation: ' + String(e.message).slice(0, 100)); }
  await page.close().catch(() => {});
  return res;
}
// B5: iPhone width render test — 390×844 viewport, check for horizontal overflow.
async function visitMobile(p) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const res = { page: p, status: 0, overflow: false, jsErrors: [] };
  page.on('pageerror', (e) => res.jsErrors.push(String(e.message).slice(0, 160)));
  try {
    const resp = await page.goto(base + p, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2000);
    res.status = resp ? resp.status() : 0;
    res.overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  } catch (e) { res.status = -1; res.jsErrors.push('navigation: ' + String(e.message).slice(0, 100)); }
  await page.close().catch(() => {});
  return res;
}

await openBrowser();
// B5: run the mobile render test over every static page.
const mobileResults = [];
for (const p of staticPages) {
  try { mobileResults.push(await visitMobile(p)); }
  catch (e) { mobileResults.push({ page: p, status: -1, overflow: false, jsErrors: [String(e.message).slice(0, 80)] }); }
}
const mobileBroken = mobileResults.filter((r) => r.overflow || r.status >= 500 || r.status === -1);
console.log(`mobile pages ${mobileResults.length}, overflow ${mobileBroken.length}`);
for (const r of mobileBroken) console.log(`MOBILE ${r.status} ${r.page} overflow=${r.overflow} ${r.jsErrors.join(' | ').slice(0, 200)}`);

for (let i = 0; i < staticPages.length; i++) {
  if (i && i % 25 === 0) await openBrowser(); // fresh browser every 25 pages (memory)
  let res;
  try { res = await visit(staticPages[i]); }
  catch { await openBrowser(); try { res = await visit(staticPages[i]); } catch (e) { res = { page: staticPages[i], status: -1, jsErrors: ['browser: ' + String(e.message).slice(0, 80)], api5xx: [], api4xx: [] }; } }
  results.push(res);
  fs.writeFileSync('/tmp/web_render.json', JSON.stringify(results, null, 1));
}
await browser.close();
const broken = results.filter((r) => r.status >= 500 || r.status === 404 || r.status === -1 || r.jsErrors.length || r.api5xx.length);
fs.writeFileSync('/tmp/web_render.json', JSON.stringify(results, null, 1));
console.log(`pages ${results.length}, broken ${broken.length}`);
for (const r of broken) console.log(`BROKEN ${r.status} ${r.page} ${[...r.jsErrors, ...r.api5xx].join(' | ').slice(0, 300)}`);
for (const r of results.filter((x) => x.api4xx.length && !broken.includes(x))) console.log(`4xx ${r.page} ${[...new Set(r.api4xx)].join(' | ').slice(0, 250)}`);
