#!/usr/bin/env node
/**
 * Board ↔ component, side by side (design review rule: "for every component, a
 * screenshot next to its board crop so it can be compared 1:1").
 *
 *   node packages/ui/build-compare.mjs [--boards docs/design/canvas] [--only id,id]
 *
 * For each entry in COMPARISONS:
 *   left   the element cut out of the board, rendered by docs/design/canvas/support.js
 *          (the board's own markup, colours and sizes);
 *   right  the REAL component from src/index.ts, rendered with the same text, theme,
 *          direction (rtl) and width, on the same canvas colour, with the token sheet
 *          and Readex Pro;
 * and writes docs/design/compare/<id>-<theme>.png.
 *
 * Needs Playwright (Chromium is preinstalled in CI images / NODE_PATH) and this
 * package's devDependencies. Boards load Readex Pro from Google Fonts; the request
 * is answered with the repo's own font files, so the run is offline and the type is
 * the same on both sides.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire, register } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const req = createRequire(import.meta.url);
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i === -1 ? d : process.argv[i + 1];
};
const BOARDS = resolve(REPO, arg('--boards', 'docs/design/canvas'));
const OUT = join(REPO, 'docs/design/compare');
const ONLY = arg('--only', '') ? new Set(arg('--only').split(',')) : null;
const FONTS = join(REPO, 'patient-app/assets/fonts');

let playwright;
try {
  playwright = req('playwright');
} catch {
  console.error('build-compare: playwright not found (install it or set NODE_PATH)');
  process.exit(2);
}
register('./tsx-loader.mjs', import.meta.url);
const ui = await import(join(HERE, 'src', 'index.ts'));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const h = React.createElement;
// tokens.css holds colours/space/radius; the type scale (--nabd-font-size-*) is in fonts.css. The
// Google Fonts @import in fonts.css is dropped: the faces come from the repo (fontFaces below).
const tokensCss =
  readFileSync(join(REPO, 'packages/design-tokens/dist/css/tokens.css'), 'utf8') +
  readFileSync(join(REPO, 'packages/design-tokens/dist/css/fonts.css'), 'utf8').replace(/^@import url\([^)]*\);$/m, '');
const shellsCss = existsSync(join(HERE, 'shells/shells.css')) ? readFileSync(join(HERE, 'shells/shells.css'), 'utf8') : '';

/**
 * id        output name
 * board     board file (without .dc.html); query: board props (e.g. theme=dark)
 * xpath     the element to cut out of the board
 * themes    which themes to render (the board must accept `theme` for dark)
 * render    the component, with the board's text
 * frame     'canvas' (default) or 'card' (the component sits in a white card on the board)
 * needs     component names that must exist in this build (else the entry is skipped)
 * viewport  page width for both sides (default 430; desktop boards use 1440)
 * inject    true: render(C, inner) also gets the board element's own children (HTML), so a
 *           shell is compared with the board's content inside it — only the chrome differs
 * pick      selector of the part of the component render to cut out (default: all of it)
 */
const raw = (html, style) => h('div', { style, dangerouslySetInnerHTML: { __html: html } });
const COMPARISONS = [
  {
    id: 'ficon-soft', board: 'FIcon', query: 'icon=pill&tone=coral&chip=soft&size=52', xpath: '//*[@id="dc-root"]/div', themes: ['light', 'dark'],
    render: (C) => h(C.FIcon, { icon: 'pill', tone: 'coral', size: 52 }), needs: ['FIcon'],
  },
  {
    id: 'ficon-solid', board: 'FIcon', query: 'icon=stethoscope&tone=teal&chip=solid&size=52', xpath: '//*[@id="dc-root"]/div', themes: ['light', 'dark'],
    render: (C) => h(C.FIcon, { icon: 'stethoscope', tone: 'teal', size: 52, chip: 'solid' }), needs: ['FIcon'],
  },
  {
    id: 'servicetile', board: 'HomeApp', xpath: "//a[.//span[normalize-space()='صيدلية']][1]", themes: ['light', 'dark'],
    render: (C) => h(C.ServiceTile, { name: 'pharmacy', label: 'صيدلية' }), needs: ['ServiceTile'],
  },
  {
    id: 'sectionheader', board: 'HomeApp', xpath: "//h2[normalize-space()='عروض وباقات']/parent::div", themes: ['light', 'dark'],
    render: (C) => h(C.SectionHeader, { title: 'عروض وباقات', actionLabel: 'عرض الكل' }), needs: ['SectionHeader'],
  },
  {
    id: 'listitem', board: 'Account', xpath: "//a[.//span[normalize-space()='العناوين']][1]", themes: ['light'], frame: 'card',
    render: (C) => h(C.ListItem, { title: 'العناوين', subtitle: '[N] عناوين', leading: { icon: 'map-pin-line', tone: 'coral' } }), needs: ['ListItem'],
  },
  {
    id: 'avatar', board: 'HomeApp', xpath: "//a[@aria-label='الملف الشخصي']", themes: ['light', 'dark'],
    render: (C) => h(C.Avatar, { name: 'نورة' }), needs: ['Avatar'],
    note: 'initials fallback; with a real photo (src) the photo fills the same ringed disc',
  },
  {
    id: 'rating-doctorcard', board: 'Consult', xpath: "//span[contains(normalize-space(),'[N.N]')][1]", themes: ['light'], frame: 'coral',
    render: (C) => h(C.Rating, { value: 4.8, count: 128, surface: 'onBrand' }), needs: ['Rating'],
    note: 'board placeholders [N.N] ([العدد]); the component renders real numbers',
  },
  {
    id: 'stickyfooter', board: 'Cart', xpath: "//button[contains(@style,'#E8384A 0%')]/parent::div", themes: ['light'], inject: true,
    render: (C, inner) => h(C.StickyFooter, null, raw(inner, { display: 'flex', gap: 10, alignItems: 'center' })),
    needs: ['StickyFooter'],
    note: 'StickyFooter chrome (glass, hairline, padding) around the board\'s own price and button. The board draws the iPhone 34px home-indicator inset; the component uses max(16px, env(safe-area-inset-bottom)), which is 34px on that iPhone and 16px in this desktop browser. Light only: Cart has no dark board.',
  },
  {
    id: 'appshell-topbar', board: 'HomeWeb', xpath: "//*[@id='dc-root']/div/div/div[1]", themes: ['light'], viewport: 1440, inject: true,
    render: (C, inner) => h(C.AppShell, { topBar: raw(inner, { display: 'flex', alignItems: 'center', gap: 28, flex: 1 }) }, null),
    pick: '.nabd-shell__top', needs: ['AppShell'],
    note: 'AppShell top bar (height, padding, glass, hairline) around the board\'s own logo, nav and actions at 1440. Light only: HomeWeb has no dark board.',
  },
];

/* ------------------------------------------------------------- servers */

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.ttf': 'font/ttf', '.css': 'text/css' };
const server = createServer((rq, rs) => {
  const url = decodeURIComponent(rq.url.split('?')[0]);
  // Resolve, then require the result to sit inside its root (prefix + separator, so a sibling
  // such as canvas-other/ does not match and ../ cannot escape).
  const root = url.startsWith('/__font/') ? FONTS : BOARDS;
  const file = resolve(root, '.' + sep + (url.startsWith('/__font/') ? url.slice(8) : url));
  if (!file.startsWith(root + sep)) return rs.writeHead(403).end();
  if (!existsSync(file)) return rs.writeHead(404).end();
  rs.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  rs.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const fontFaces = [300, 400, 500, 600, 700]
  .map((w) => `@font-face{font-family:'Readex Pro';font-weight:${w};src:url(http://localhost:${PORT}/__font/ReadexPro-${w === 600 ? 700 : w}.ttf)}`)
  .join('');

/* -------------------------------------------------------------- render */

if (!existsSync(join(BOARDS, 'support.js'))) {
  console.error(`build-compare: ${BOARDS}/support.js missing (the board runtime, see docs/design/canvas)`);
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const browser = await playwright.chromium.launch();
const done = [];

for (const c of COMPARISONS) {
  if (ONLY && !ONLY.has(c.id)) continue;
  if (!existsSync(join(BOARDS, `${c.board}.dc.html`))) {
    console.warn(`skip ${c.id}: board ${c.board} not in ${BOARDS}`);
    continue;
  }
  const missing = (c.needs || []).filter((n) => !ui[n]);
  if (missing.length) {
    console.warn(`skip ${c.id}: ${missing.join(', ')} not in this build`);
    continue;
  }
  for (const theme of c.themes) {
    const page = await browser.newPage({ viewport: { width: c.viewport || 430, height: 1200 }, deviceScaleFactor: c.viewport > 1000 ? 1 : 2 });
    await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fontFaces }));
    const q = [c.query, theme === 'dark' ? 'theme=dark' : ''].filter(Boolean).join('&');
    await page.goto(`http://localhost:${PORT}/${c.board}.dc.html${q ? `?${q}` : ''}`);
    await page.addStyleTag({ content: `*{animation:none!important;transition:none!important}` });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.fonts.ready);
    const el = page.locator(`xpath=${c.xpath}`).first();
    if ((await el.count()) === 0) {
      console.warn(`skip ${c.id}/${theme}: ${c.xpath} not found in ${c.board}`);
      await page.close();
      continue;
    }
    const box = await el.boundingBox();
    const boardPng = (await el.screenshot()).toString('base64');
    const inner = c.inject ? await el.evaluate((n) => n.innerHTML) : '';
    const boardBg = await page.evaluate(() => getComputedStyle(document.querySelector('#dc-root > *') || document.body).backgroundColor);

    const body = renderToStaticMarkup(c.render(ui, inner));
    const frame =
      c.frame === 'card'
        ? `<div style="border-radius:24px;background:var(--nabd-color-bg-surface);border:1px solid var(--nabd-color-border-hairline);overflow:hidden">${body}</div>`
        : c.frame === 'coral'
          ? `<div style="padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,var(--nabd-color-action-fab-from),var(--nabd-color-action-fab-to))">${body}</div>`
          : body;
    await page.setContent(
      `<!doctype html><html dir="rtl" lang="ar" data-theme="${theme}"><meta charset="utf-8"><style>${fontFaces}${tokensCss}${shellsCss}
      body{margin:0;background:var(--nabd-color-bg-canvas);font-family:'Readex Pro',system-ui,sans-serif;color:var(--nabd-color-text-primary)}
      #c{display:inline-block;padding:0;inline-size:${Math.ceil(box.width)}px}</style><body><div id="c">${frame}</div></body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const compPng = (await page.locator(c.pick ? `#c ${c.pick}` : '#c').first().screenshot()).toString('base64');

    // side by side: board | component, labelled
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px system-ui;background:#888}
      .row{display:flex;flex-direction:${box.width > 700 ? 'column' : 'row'};gap:24px;padding:20px;align-items:flex-start}.col{display:grid;gap:8px;justify-items:start}
      .col b{color:#fff}.col div{padding:16px;background:${boardBg};border-radius:8px}.col img{display:block;max-width:none}
      em{color:#eee;padding:0 20px 16px;display:block}</style>
      <div class="row"><div class="col"><b>Board: ${c.board} (${theme})</b><div><img src="data:image/png;base64,${boardPng}" style="width:${box.width}px"></div></div>
      <div class="col"><b>Component (${theme})</b><div><img src="data:image/png;base64,${compPng}" style="width:${box.width}px"></div></div></div>
      ${c.note ? `<em>${c.note}</em>` : ''}`);
    await page.waitForTimeout(100);
    const file = join(OUT, `${c.id}-${theme}.png`);
    await page.locator('body').evaluate((b) => { b.style.display = 'inline-block'; });
    await page.locator('body').screenshot({ path: file });
    done.push(`${c.id}-${theme}.png`);
    await page.close();
  }
}

await browser.close();
server.close();
writeFileSync(join(OUT, 'README.md'), `# Board ↔ component comparisons\n\nGenerated by \`node packages/ui/build-compare.mjs\`. Left: the element cut out of the board (rendered by \`docs/design/canvas/support.js\`). Right: the real component with the same text, theme, width and direction.\n\n${done.map((f) => `- [${f}](${f})`).join('\n')}\n`);
console.log(`build-compare: wrote ${done.length} comparison(s) to docs/design/compare/`);
