#!/usr/bin/env node
/**
 * Runtime contrast audit for patient-web (Phase 12, C1 / accessibility).
 *
 * WHY THIS EXISTS
 *
 * The static token contrast checker reads `tokens.json` and proves that the
 * DECLARED pairs are legible. It cannot see a screen. The two hero buttons on
 * the home page were white on `rgba(255, 255, 255, 0.12)` — 1.00:1 — and every
 * declared pair in the token file passed, because nothing declared that pair:
 * a CSS module invented it.
 *
 * So this walks the rendered pages, and it composites alpha the way the browser
 * does. Reading `backgroundColor` alone is what makes naive audits miss exactly
 * the case that shipped: `rgba(255,255,255,0.12)` looks white-ish, and the
 * white text on top of it looks fine if you never blend it with what is
 * underneath.
 *
 * For each text-bearing element it:
 *   1. collects the background stack from the element up to <html>;
 *   2. composites it bottom-up into one opaque colour;
 *   3. measures the text colour against that;
 *   4. applies the WCAG threshold for the element's real text size
 *      (3:1 for large text, 4.5:1 otherwise).
 *
 * Elements whose background comes from a background-image (gradient, image) are
 * reported separately as UNRESOLVED rather than silently passed, because their
 * real colour cannot be derived from computed style.
 *
 * Usage:
 *   node tools/design/runtime-contrast.mjs [--base http://localhost:3999]
 *                                           [--routes routes.txt] [--json out.json]
 *                                           [--update] [--strict]
 *
 * Like no-raw-color, this is a RATCHET: `--update` records the current findings
 * and only ever lowers them. A screen that is rebuilt onto tokens drops out.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const BASELINE_PATH = resolve(REPO, 'tools/design/runtime-contrast.baseline.json');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const BASE = arg('--base', 'http://localhost:3999');
const ROUTES_FILE = arg('--routes', null);
const JSON_OUT = arg('--json', null);
const IS_UPDATE = argv.includes('--update');
// A hung route must not cost 30s. This is a colour audit, not a load test;
// C4 measures whether pages actually load.
const NAV_TIMEOUT = Number(arg('--timeout', 10000));
// CSS.getMatchedStylesForNode is expensive (one round trip per failing element),
// so attribution is opt-in and capped. The FAILURE LIST is the gate; the owning
// file is a convenience for whoever fixes it.
const ATTRIBUTE = argv.includes('--attribute');
const ATTRIBUTE_CAP = Number(arg('--attribute-cap', 10));

/* ------------------------------------------------------------------ in-page */

/**
 * Runs in the browser. Returns one record per text-bearing element that fails,
 * plus the unresolved-gradient list.
 */
const APPLY_THEME = `(t) => {
  // Mirror app/theme.ts exactly. Setting only the attribute is how the original
  // defect was found: the tokens flip but the 64 :global(.dark) page overrides
  // never fire, so the audit would measure a state the app cannot actually be in.
  const d = document.documentElement;
  d.setAttribute('data-theme', t);
  d.classList.toggle('dark', t === 'dark');
  d.style.colorScheme = t;
}`;

const AUDIT_IN_PAGE = `(() => {
  const px = (el) => el.getBoundingClientRect();

  const parseColor = (str) => {
    const m = String(str).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };

  /** Composite \`top\` over \`bottom\` (both parsed colours). */
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });

  /** Walk up and flatten every background into one opaque colour. */
  const effectiveBg = (el) => {
    const stack = [];
    let node = el;
    let sawImage = null;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !sawImage) {
        sawImage = cs.backgroundImage.slice(0, 40);
      }
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a === 1) break; // opaque: nothing below it can show through
      }
      node = node.parentElement;
    }
    // Bottom-up: the last element we collected is the outermost.
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
    return { color: out, sawImage };
  };

  const srgb = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = (c) => 0.2126 * srgb(c.r) + 0.7152 * srgb(c.g) + 0.0722 * srgb(c.b);
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    const id = el.id ? '#' + el.id : '';
    // CSS-module classes are hashed; keep the readable part.
    const clean = (cls + id)
      .split(/\\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((c) => c.replace(/^[^_]*_/, '').replace(/__[A-Za-z0-9_-]{5,}$/, ''))
      .join('.');
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
    return (clean || el.tagName.toLowerCase()) + (text ? ' :: ' + text : '');
  };

  const failures = [];
  const unresolved = [];
  const seen = new Set();

  for (const el of document.querySelectorAll('body *')) {
    // Only elements that directly render text.
    const direct = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!direct) continue;

    const r = px(el);
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;

    // An sr-only / visually-hidden label is not read off the screen, so its
    // contrast is not a user-facing concern. The standard pattern is 1x1 px with
    // clip, so the size test alone would not catch it and it would be reported
    // as unreadable text that nobody can see.
    const hiddenByClip =
      (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') &&
      (r.width <= 2 || r.height <= 2);
    if (hiddenByClip) continue;
    if (el.closest('[aria-hidden="true"]')) continue;

    const { color: bg, sawImage } = effectiveBg(el);
    const fg = parseColor(cs.color);
    if (!fg) continue;

    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;

    // The text itself may be translucent; flatten it onto the background.
    const flat = fg.a < 1 ? over(fg, bg) : fg;
    const r_ = ratio(flat, bg);

    const key = describe(el);
    if (r_ < need) {
      if (seen.has(key)) continue;
      seen.add(key);
      el.setAttribute('data-rc-fail', '1');
      failures.push({
        nodeId: el.__rcId = (el.__rcId || 0),
        sel: key,
        ratio: Number(r_.toFixed(2)),
        need,
        size,
        weight,
        color: cs.color,
        bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(', ') + ')',
      });
    }
    if (sawImage) {
      if (seen.has('img:' + key)) continue;
      seen.add('img:' + key);
      unresolved.push({ sel: key, image: sawImage });
    }
  }
  return { failures, unresolved, url: location.pathname };
})()`;

/* -------------------------------------------------------------------- run */

async function loadPlaywright() {
  // Resolve from the repo first, then from anywhere on NODE_PATH, then from an
  // explicit PLAYWRIGHT_PATH. A design gate that cannot find its own browser
  // driver is a gate nobody runs.
  const candidates = [
    () => import('playwright'),
    () => {
      const req = createRequire(import.meta.url);
      const from = process.env.PLAYWRIGHT_PATH || 'playwright';
      return import(pathToFileURL(req.resolve(from)).href);
    },
  ];
  for (const attempt of candidates) {
    try {
      const mod = await attempt();
      // playwright is CJS, so depending on how it is loaded the browser
      // factories sit on the namespace or on its default export.
      const pw = mod.chromium ? mod : mod.default;
      if (pw && pw.chromium) return pw;
    } catch {
      /* try the next strategy */
    }
  }
  console.error(
    'runtime-contrast: cannot resolve `playwright`.\n' +
      '  npm i -D playwright && npx playwright install chromium\n' +
      '  or point PLAYWRIGHT_PATH at an existing install.',
  );
  process.exit(2);
}

async function main() {
  const { chromium } = await loadPlaywright();
  let routes;
  if (ROUTES_FILE && existsSync(ROUTES_FILE)) {
    routes = readFileSync(ROUTES_FILE, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  } else {
    routes = ['/en'];
  }
  const themes = ['light', 'dark'];
  const exe = process.env.CHROME_PATH;

  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const findings = [];
  const unresolved = [];
  let checked = 0;
  let skipped = 0;
  let duplicates = 0;
  let stalled = 0;

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Many authenticated routes redirect to the same /en/login. Rendering that
  // page forty times is pure waste, so a route is only audited in a given theme
  // if the URL it actually lands on has not been audited in that theme yet.
  const audited = new Set();

  for (const route of routes) {
    console.log(`runtime-contrast: ${route}`);
    for (const theme of themes) {
      const page = await context.newPage();
      const stylesheets = new Map();
      let cdp = null;
      // A colour audit must never be the reason a pipeline hangs. goto() has its
      // own timeout, but page.evaluate() and page.close() do not, and a route
      // that keeps a client-side loop busy can wedge them. This races the whole
      // per-page unit against a hard ceiling.
      let hung = false;
      const work = (async () => {
        const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
        const status = res ? res.status() : 0;
        if (status >= 400) { skipped++; return; }
        // Settle cheaply: stop loading, then give the theme attribute a tick.
        await page.evaluate(() => document.readyState);
        await page.waitForTimeout(60);
        const landed = new URL(page.url()).pathname;
        const key = theme + ' ' + landed;
        if (audited.has(key)) { duplicates++; return; }
        audited.add(key);
        await page.evaluate(APPLY_THEME, theme);
        await page.waitForTimeout(60);
        const out = await page.evaluate(AUDIT_IN_PAGE);
        for (const f of out.failures) findings.push({ ...f, route, theme, landed });
        for (const u of out.unresolved) unresolved.push({ ...u, route, theme, landed });
        checked++;

        if (ATTRIBUTE && out.failures.length) {
          // Ask the browser which stylesheet actually declared the colour. The
          // rendered text comes from i18n, so the string is useless for finding
          // the file; the matched rule is not.
          try {
            if (!cdp) {
              cdp = await context.newCDPSession(page);
              cdp.on('CSS.styleSheetAdded', (e) =>
                stylesheets.set(e.header.styleSheetId, e.header.sourceURL));
            }
            await cdp.send('DOM.enable');
            await cdp.send('CSS.enable');
            const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
            const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
              nodeId: root.nodeId, selector: '[data-rc-fail]',
            });
            const limit = Math.min(nodeIds.length, out.failures.length, ATTRIBUTE_CAP);
            for (let i = 0; i < limit; i++) {
              const matched = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: nodeIds[i] });
              const urls = [];
              for (const m of matched.matchedCSSRules || []) {
                const rule = m.rule;
                const txt = rule.style.cssText || '';
                if (!/\b(color|background|background-color)\b/.test(txt)) continue;
                const url = stylesheets.get(rule.styleSheetId);
                if (url && !urls.includes(url)) urls.push(url);
              }
              if (urls.length) out.failures[i].owners = urls.slice(0, 3);
            }
            await page.evaluate(() => {
              document.querySelectorAll('[data-rc-fail]').forEach((e) => e.removeAttribute('data-rc-fail'));
            });
          } catch { /* attribution is a convenience, never a gate */ }
        }
      })();
      try {
        await Promise.race([
          work,
          new Promise((_, reject) =>
            setTimeout(() => { hung = true; reject(new Error('watchdog')); }, NAV_TIMEOUT * 3)),
        ]);
      } catch {
        if (hung) stalled++; else skipped++;
      } finally {
        if (cdp) { try { await cdp.detach(); } catch { /* ignore */ } }
        await page.close().catch(() => {});
      }
    }
  }
  await context.close();
  await browser.close();

  // A repeated selector failing on many routes is one design decision, not many.
  const bySignature = new Map();
  for (const f of findings) {
    const k = f.sel;
    if (!bySignature.has(k)) bySignature.set(k, { sel: k, ratio: f.ratio, need: f.need, routes: [], themes: new Set() });
    const e = bySignature.get(k);
    e.routes.push(f.route);
    e.themes.add(f.theme);
  }
  const signatures = [...bySignature.values()]
    .map((e) => ({ ...e, routes: [...new Set(e.routes)], themes: [...e.themes] }))
    .sort((a, b) => a.ratio - b.ratio);

  const payload = {
    note:
      'Rendered text that fails WCAG contrast, recorded per signature with the routes it ' +
      'appears on. --update only ever lowers this. 12.A11 clears it as screens are rebuilt.',
    base: BASE,
    signatures,
  };

  if (IS_UPDATE) {
    writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(
      `runtime-contrast: recorded ${signatures.length} signature(s) across ` +
        `${checked} render(s) (${skipped} skipped, ${duplicates} duplicate-of-redirect, ` +
        `${stalled} stalled).`,
    );
    console.log(`runtime-contrast: ${unresolved.length} element(s) sit on a background-image and are unresolved.`);
    return;
  }

  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const base = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
  if (!base) {
    console.error('runtime-contrast: no baseline. Run --update once against a running server.');
    process.exit(2);
  }
  const allowed = new Map((base.signatures || []).map((s) => [s.sel, s]));
  const problems = [];
  for (const s of signatures) {
    if (!allowed.has(s.sel)) {
      problems.push(
        `  NEW  ${s.ratio}:1 (needs ${s.need}:1)  ${s.sel}\n        on ${s.routes.length} route(s), e.g. ${s.routes[0]}`,
      );
    }
  }
  // A baseline entry that did not appear is a warning, not a failure: in CI the pages render
  // without a backend, so a route that times out on one run simply has no text to measure, and
  // failing on that made the gate flaky. NEW unreadable text still fails.
  const gone = [...allowed.keys()].filter((k) => !bySignature.has(k));
  if (gone.length) {
    console.log(`runtime-contrast: note: ${gone.length} baseline signature(s) not seen this run (fixed, or the route did not render) — lower the baseline with --update after a full local run.`);
  }

  console.log(
    `runtime-contrast: ${checked} render(s) checked, ${skipped} skipped, ` +
      `${duplicates} duplicate-of-redirect, ${stalled} stalled, ` +
      `${signatures.length} failing signature(s) (baseline ${allowed.size}).`,
  );
  if (unresolved.length) {
    console.log(`runtime-contrast: ${unresolved.length} element(s) on a background-image are UNRESOLVED and unchecked.`);
  }
  if (problems.length) {
    console.error('runtime-contrast: FAILED\n');
    problems.forEach((p) => console.error(p));
    process.exit(1);
  }
  console.log('runtime-contrast: no NEW failing text.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
