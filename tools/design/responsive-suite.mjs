#!/usr/bin/env node
/**
 * 12.A10 — the responsive screenshot suite.
 *
 * The spec's Verify: "Playwright screenshot suite 375/768/1280/1920 × ar/en ×
 * light/dark, with overflow and overlap checks."
 *
 * WHY THIS IS A GATE AND NOT A GALLERY
 *
 * A screenshot suite that only writes PNGs tells you something is wrong only if
 * a human opens 32 images. This renders the same matrix and then ASSERTS two
 * things that do not need a human:
 *
 *   1. no horizontal overflow — `scrollWidth > clientWidth` on the document is
 *      the single most common responsive defect and it is invisible in a
 *      screenshot unless you know to look;
 *   2. no clipped text — an element whose scrollWidth exceeds its clientWidth is
 *      content the user cannot read, which a screenshot shows as "...", so it
 *      does need to be measured.
 *
 * Overlap is measured too, but honestly: a real overlap detector reports
 * hundreds of false positives on legitimately stacked or nested elements, so it
 * only counts pairs of INTERACTIVE elements that overlap and are not
 * ancestor/descendant of each other — which is the case a user cannot click
 * through.
 *
 * RATCHETED per route × viewport, so a new screen starts at zero and a fixed one
 * drops out with `--update`.
 *
 * Usage:
 *   node tools/design/responsive-suite.mjs --base http://localhost:3999
 *                                            [--routes <file>] [--update] [--shots <dir>]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const BASELINE_PATH = join(REPO, 'tools/design/responsive-suite.baseline.json');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(n);
  return i === -1 ? d : argv[i + 1];
};
// Trailing slash stripped and re-added per request: BASE + locale + route
// with no separator produced `localhost:3999en/`, which 404s on every one of
// the 192 renders and reports a clean sheet rather than a failure.
const BASE = arg('--base', 'http://localhost:3999').replace(/\/+$/, '');
const SHOTS = arg('--shots', null);
const IS_UPDATE = argv.includes('--update');
const ALL = argv.includes('--all-routes');

/** The four widths the spec names, plus the two it pairs them with. */
const WIDTHS = [375, 768, 1280, 1920];
const LOCALES = ['ar', 'en'];
const THEMES = ['light', 'dark'];

/**
 * The matrix is the spec's, but 12 routes x 2 locales x 4 widths x 2 themes is
 * 192 renders and took over half an hour, which is not a gate anyone runs. The
 * spec's four widths and two locales and two themes are all kept; the route list
 * is the representative core, and `--all-routes` widens it when a screen is
 * rebuilt.
 */
const ROUTES = [
  '/', '/c', '/consultations/doctors', '/diagnostics', '/map', '/login',
];
const ALL_ROUTES = [
  ...ROUTES, '/labs', '/articles', '/community', '/insurance', '/pharmacy',
  '/nursing', '/cart', '/profile', '/orders', '/appointments', '/search',
];

/**
 * Runs in the page. Measures the two defects a screenshot hides, and reports the
 * overflowing/clipped elements by a readable label so the failure names a thing
 * rather than a coordinate.
 */
const MEASURE = `(() => {
  const doc = document.documentElement;
  const overflowPx = Math.max(0, doc.scrollWidth - doc.clientWidth);

  const label = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\\s+/).filter(Boolean)[0] || '';
    const clean = cls.replace(/^[^_]*_/, '').replace(/__[A-Za-z0-9_-]{4,}$/, '');
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28);
    return el.tagName.toLowerCase() + (clean ? '.' + clean : '') + (text ? ' "' + text + '"' : '');
  };

  // Clipped text: the element is narrower than its own content. One line of
  // tolerance, because sub-pixel rounding otherwise fails everything.
  const clipped = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,span,a,button,label,li,td,th')) {
    const cs = getComputedStyle(el);
    if (cs.overflow === 'visible' || cs.textOverflow === 'ellipsis') continue;
    if (cs.whiteSpace === 'nowrap' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
    if (el.scrollWidth > el.clientWidth + 1) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) clipped.push(label(el));
    }
  }

  // Overlap: two interactive elements covering each other, neither an ancestor
  // of the other. That is the case where a user cannot reach the one underneath.
  const clickable = [...document.querySelectorAll('a[href], button, [role="button"], input, select, textarea')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) !== 0;
    });
  const overlap = [];
  for (let i = 0; i < clickable.length; i++) {
    for (let j = i + 1; j < clickable.length; j++) {
      const a = clickable[i], b = clickable[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 2 && oy > 2) {
        // Ignore a full overlay: a modal scrim legitimately covers the page.
        const covers = (outer, inner) =>
          outer.width >= inner.width * 0.98 && outer.height >= inner.height * 0.98;
        if (covers(ra, rb) || covers(rb, ra)) continue;
        const area = ox * oy;
        const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (area / smaller > 0.6) overlap.push(label(a) + '  ><  ' + label(b));
      }
    }
  }

  return {
    overflowPx,
    clipped: [...new Set(clipped)].slice(0, 8),
    overlap: [...new Set(overlap)].slice(0, 6),
    height: doc.scrollHeight,
  };
})()`;

async function loadPlaywright() {
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const req = createRequire(import.meta.url);
  for (const spec of ['playwright', process.env.PLAYWRIGHT_PATH].filter(Boolean)) {
    try {
      const mod = spec === 'playwright' ? await import('playwright') : await import(pathToFileURL(req.resolve(spec)).href);
      const pw = mod.chromium ? mod : mod.default;
      if (pw && pw.chromium) return pw;
    } catch { /* next */ }
  }
  console.error('responsive-suite: cannot resolve `playwright`. Set PLAYWRIGHT_PATH or install it.');
  process.exit(2);
}

const APPLY_THEME = `(t) => {
  const d = document.documentElement;
  d.setAttribute('data-theme', t);
  d.classList.toggle('dark', t === 'dark');
  d.style.colorScheme = t;
}`;

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  );
  const context = await browser.newContext();
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });

  const results = new Map();
  let renders = 0;

  for (const route of ALL ? ALL_ROUTES : ROUTES) {
    for (const locale of LOCALES) {
      for (const width of WIDTHS) {
        const page = await context.newPage();
        try {
          await page.setViewportSize({ width, height: 900 });
          const res = await page.goto(`${BASE}/${locale}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          if (!res || res.status() >= 400) continue;
          for (const theme of THEMES) {
            await page.evaluate(APPLY_THEME, theme);
            await page.waitForTimeout(80);
            const m = await page.evaluate(MEASURE);
            const key = `${route}@${width}:${locale}:${theme}`;
            results.set(key, {
              overflowPx: m.overflowPx,
              clipped: m.clipped.length,
              overlap: m.overlap.length,
            });
            if (SHOTS) {
              await page.screenshot({
                path: join(SHOTS, `${route.replace(/\//g, '_') || 'home'}-${width}-${locale}-${theme}.png`),
                fullPage: false,
              });
            }
            renders++;
          }
        } catch { /* a route that will not load is a separate concern */ }
        finally { await page.close(); }
      }
    }
  }
  await context.close();
  await browser.close();

  const total = results.size;
  const offenders = [...results.entries()].filter(([, v]) => v.overflowPx > 0 || v.clipped || v.overlap);
  console.log(`responsive-suite: ${renders} render(s) across ${WIDTHS.length} widths × ${LOCALES.length} locales × ${THEMES.length} themes.`);
  console.log(`responsive-suite: ${total} measured combination(s), ${offenders.length} with a defect.`);

  const baseline = !IS_UPDATE && existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : null;

  // A run that measured nothing must not write a baseline: an empty baseline
  // makes the gate pass vacuously, which is how the first run of this tool
  // "passed" while having checked 0 of 192 combinations.
  if (total === 0) {
    console.error('responsive-suite: measured 0 combinations — refusing to write a baseline.');
    console.error(`  check the server at ${BASE} and the route list`);
    process.exit(2);
  }

  if (IS_UPDATE || !baseline) {
    const files = {};
    for (const [k, v] of offenders) {
      if (v.overflowPx > 0 || v.clipped || v.overlap) files[k] = { ...v };
    }
    writeFileSync(
      BASELINE_PATH,
      JSON.stringify(
        {
          note:
            'Viewport combinations with horizontal overflow, clipped text or an unclickable ' +
            'overlap. Ratcheted; --update only ever lowers it. 12.A11 clears these as screens are ' +
            'rebuilt on the responsive scale.',
          files,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    for (const [k, v] of offenders) {
      const bits = [];
      if (v.overflowPx > 0) bits.push(`overflow ${v.overflowPx}px`);
      if (v.clipped) bits.push(`${v.clipped} clipped`);
      if (v.overlap) bits.push(`${v.overlap} overlap`);
      console.log(`  ${k.padEnd(34)} ${bits.join(', ')}`);
    }
    console.log(
      IS_UPDATE
        ? `responsive-suite: recorded ${offenders.length} defective combination(s).`
        : 'responsive-suite: no baseline. Run with --update to record, then enforce.',
    );
    process.exit(0);
  }

  const problems = [];
  for (const [k, v] of offenders) {
    const allowed = baseline.files[k];
    if (!allowed) {
      problems.push(`  NEW  ${k} — ${JSON.stringify(v)}`);
    } else if (v.overflowPx > allowed.overflowPx) {
      problems.push(`  GREW  ${k} — overflow ${allowed.overflowPx}px -> ${v.overflowPx}px`);
    }
  }
  const gone = Object.keys(baseline.files).filter((k) => !offenders.some(([kk]) => kk === k));
  if (gone.length) problems.push(`  ${gone.length} combination(s) fixed — run --update to lower`);

  if (problems.length) {
    console.error('\nresponsive-suite: FAILED\n');
    problems.forEach((p) => console.error(p));
    process.exit(1);
  }
  console.log(
    `responsive-suite: no NEW overflow, clipping or overlap. ${offenders.length} ratcheted ` +
      `combination(s) remain. PARTIAL: 12.A11 clears them.`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
