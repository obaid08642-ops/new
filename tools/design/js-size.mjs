#!/usr/bin/env node
/**
 * Shared-JS size per route (QUALITY_STANDARDS.md §2 budget, issue #286): loads each route in Chromium against a
 * running PRODUCTION server and sums the compressed bytes of the scripts the page fetches.
 *
 *   cd patient-web && pnpm build && cp -r .next/static .next/standalone/.next/static
 *   PORT=3010 HOSTNAME=127.0.0.1 NABD_API_BASE_URL=<seeded backend> node .next/standalone/server.js &
 *   node tools/design/js-size.mjs --base http://localhost:3010 --routes /ar,/ar/pharmacy,/ar/consultations/doctors
 *
 * It reports gz bytes straight from the network layer (`responseBodySize`), so it is stable and comparable between
 * two builds. Lighthouse's own "script" number (what CI asserts, 170 KB) also counts headers and is a few percent
 * higher; compare like with like, and use `next experimental-analyze -o` to see which module a chunk's bytes are.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require('playwright'); } catch { return require('/opt/node-tools/node_modules/playwright'); }
})();
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:3010');
const ROUTES = arg('routes', '/ar,/ar/pharmacy,/ar/consultations/doctors,/ar/login').split(',');

const browser = await chromium.launch();
for (const route of ROUTES) {
  const page = await browser.newPage();
  const scripts = [];
  page.on('requestfinished', async (r) => {
    if (r.resourceType() === 'script') scripts.push({ file: new URL(r.url()).pathname.split('/').pop(), gz: (await r.sizes()).responseBodySize });
  });
  await page.goto(BASE + route, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // the session heartbeat keeps `networkidle` from ever arriving
  const total = scripts.reduce((a, s) => a + s.gz, 0);
  const top = scripts.sort((a, b) => b.gz - a.gz).slice(0, 5).map((s) => `${s.file} ${(s.gz / 1024).toFixed(1)}`).join(', ');
  console.log(`${route.padEnd(30)} ${(total / 1024).toFixed(1).padStart(6)} KB gz  ${String(scripts.length).padStart(2)} scripts   top: ${top}`);
  await page.close();
}
await browser.close();
