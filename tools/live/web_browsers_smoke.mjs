/** P15.10 browser smoke: key patient-web routes render (not blank) with zero
 * page errors, on whichever Playwright browser launched this process.
 *
 *   node tools/live/web_browsers_smoke.mjs [baseUrl] [route ...]
 *
 * The CI matrix (.github/workflows/p15-web-browsers.yml) runs it once per
 * browser project (Chromium = desktop Chrome + the Samsung Internet proxy —
 * Samsung Internet is Chromium-based and has no Playwright build, so it is
 * covered here by Chromium plus a real Galaxy device in the device-farm
 * matrix; Safari iOS 16+ by WebKit plus real iPhones in the farm).
 * Exits non-zero on any blank page, any pageerror, or any failed request
 * to the app's own origin. Usage/help text only — no mocks, no fixtures.
 */
import { chromium, firefox, webkit } from 'playwright';

const BASE = process.argv[2] || process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const ROUTES = process.argv.slice(3).length ? process.argv.slice(3) : ['/ar', '/ar/pharmacy', '/ar/consultations/doctors'];
const BROWSER = process.env.SMOKE_BROWSER || 'chromium';
const impl = { chromium, firefox, webkit }[BROWSER];
if (!impl) { console.error(`unknown SMOKE_BROWSER=${BROWSER}`); process.exit(2); }

const failures = [];
const browser = await impl.launch();
try {
  for (const route of ROUTES) {
    const page = await browser.newPage({ locale: 'ar-SA' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
    page.on('response', (r) => {
      try {
        if (new URL(r.url()).origin === new URL(BASE).origin && r.status() >= 500) errors.push(`own-origin ${r.status()} ${r.url().slice(0, 120)}`);
      } catch { /* non-URL, ignore */ }
    });
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
    } catch (e) { errors.push(`goto failed: ${String(e).slice(0, 200)}`); }
    let chars = 0;
    try { chars = (await page.evaluate('() => document.body ? document.body.innerText.length : 0')) || 0; } catch { /* gone */ }
    if (chars < 200) errors.push(`blank-or-thin page: ${chars} text chars`);
    console.log(`${BROWSER} ${route}: ${errors.length ? 'FAIL ' + errors.join(' | ') : `ok (${chars} chars)`}`);
    failures.push(...errors.map((m) => `${BROWSER} ${route}: ${m}`));
    await page.close();
  }
} finally {
  await browser.close();
}
if (failures.length) { console.error(`SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log(`SMOKE PASS ${BROWSER} (${ROUTES.length} routes)`);
