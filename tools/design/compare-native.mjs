#!/usr/bin/env node
/**
 * Native shells ↔ boards, side by side (design review: "for every component, a
 * screenshot next to its board crop so it can be compared 1:1").
 *
 *   node tools/design/compare-native.mjs [--boards docs/design/canvas]
 *
 * Left: the strip cut out of the board (rendered by docs/design/canvas/support.js).
 * Right: the real shell from packages/ui-native/src/shells, rendered through
 * react-native-web (patient-app's copy) in the same 390-wide frame, with the board's
 * labels and the board's own icon paths, and the insets the board frame draws.
 * Writes docs/design/compare/native-<id>-<theme>.png.
 *
 * Needs Playwright (Chromium) and patient-app's node_modules; esbuild comes from
 * packages/ui.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(import.meta.url);
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i === -1 ? d : process.argv[i + 1];
};
const BOARDS = resolve(REPO, arg('--boards', 'docs/design/canvas'));
const OUT = join(REPO, 'docs/design/compare');
const FONTS = join(REPO, 'patient-app/assets/fonts');
const NM = join(REPO, 'patient-app/node_modules');

let playwright;
try {
  playwright = req('playwright');
} catch {
  console.error('compare-native: playwright not found (install it or set NODE_PATH)');
  process.exit(2);
}
if (!existsSync(join(BOARDS, 'support.js'))) {
  console.error(`compare-native: ${BOARDS}/support.js missing (the board runtime)`);
  process.exit(2);
}

const esbuild = createRequire(join(REPO, 'packages/ui/package.json'))('esbuild');
const bundle = await esbuild.build({
  entryPoints: [join(REPO, 'tools/design/compare-native.entry.jsx')],
  bundle: true,
  write: false,
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  alias: {
    'react-native': join(NM, 'react-native-web'),
    '@shells': join(REPO, 'packages/ui-native/src/shells/index.ts'),
    '@ui-native': join(REPO, 'packages/ui-native/src/index.ts'),
    react: join(NM, 'react'),
    'react-dom': join(NM, 'react-dom'),
    'react-native-svg': join(NM, 'react-native-svg'),
    'react-native-safe-area-context': join(NM, 'react-native-safe-area-context'),
  },
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'window' },
  logLevel: 'error',
});
const appJs = bundle.outputFiles[0].text;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const server = createServer((rq, rs) => {
  const url = decodeURIComponent(rq.url.split('?')[0]);
  if (url === '/__app.js') return rs.writeHead(200, { 'content-type': MIME['.js'] }).end(appJs);
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
const BASE = `http://localhost:${server.address().port}`;
// board: Google Fonts answered with the repo's Readex Pro; shells: the app's font names
const boardFaces = [300, 400, 500, 600, 700]
  .map((w) => `@font-face{font-family:'Readex Pro';font-weight:${w};src:url(${BASE}/__font/ReadexPro-${w === 600 ? 700 : w}.ttf)}`)
  .join('');
const appFaces = [400, 500, 700].map((w) => `@font-face{font-family:'ReadexPro-${w}';src:url(${BASE}/__font/ReadexPro-${w}.ttf)}`).join('') + boardFaces;

/**
 * crop      returns {y, height} of the strip to cut from the board (390 wide)
 * data      reads what the shell needs from the board DOM
 * cmp       the props for the entry (window.__CMP)
 */
const COMPARISONS = [
  {
    id: 'tabbar', board: 'HomeApp', themes: ['light', 'dark'],
    crop: () => {
      const nav = document.querySelector('nav').getBoundingClientRect();
      const root = document.querySelector('#dc-root > div').getBoundingClientRect();
      return { y: nav.top - 44, height: root.bottom - nav.top + 44, bottom: root.bottom - nav.bottom };
    },
    data: () => {
      const nav = document.querySelector('nav');
      return {
        label: nav.getAttribute('aria-label'),
        tabs: [...nav.querySelectorAll('a')].map((a, i) => ({
          key: `t${i}`,
          label: a.getAttribute('aria-label'),
          // support.js writes a true attribute value as aria-current=""
          cur: a.hasAttribute('aria-current'),
          fab: Boolean(a.querySelector('span svg')),
          d: a.querySelector('path').getAttribute('d'),
        })),
      };
    },
    cmp: (box, data, theme) => ({ kind: 'tabbar', theme, height: box.height, insetBottom: box.bottom, ...data }),
    note: 'Icons are the board\'s own paths. The bottom inset is set to the board\'s 28 px so the bars line up; on an iPhone 15 Pro the bar sits at the real inset (34).',
  },
  {
    id: 'stickyfooter', board: 'Cart', themes: ['light'],
    crop: () => {
      const bar = [...document.querySelectorAll('button')].find((b) => b.getAttribute('style').includes('#E8384A 0%')).parentElement.getBoundingClientRect();
      return { y: bar.top, height: bar.height };
    },
    data: () => ({ html: [...document.querySelectorAll('button')].find((b) => b.getAttribute('style').includes('#E8384A 0%')).parentElement.innerHTML }),
    cmp: (box, data, theme) => ({ kind: 'footer', theme, height: box.height, insetBottom: 34, ...data }),
    note: 'StickyFooter chrome (canvas glass, hairline, padding, the 34 px iPhone inset) around the board\'s own price and button. Light only: Cart has no dark board.',
  },
  {
    id: 'appheader', board: 'Settings', themes: ['light'],
    crop: () => {
      const back = document.querySelector('button[aria-label]').getBoundingClientRect();
      const root = document.querySelector('#dc-root > div').getBoundingClientRect();
      return { y: root.top, height: back.bottom - root.top + 8, top: back.top - root.top };
    },
    data: () => {
      const back = document.querySelector('button[aria-label]');
      return { backLabel: back.getAttribute('aria-label'), title: back.parentElement.querySelector('h1').textContent };
    },
    cmp: (box, data, theme) => ({ kind: 'header', theme, height: box.height, insetTop: box.top, ...data }),
    note: 'The top inset is set to the board\'s 54 px status-bar space; on a device it is the real inset. Light only: Settings has no dark board.',
  },
];

/**
 * Contract components (packages/ui-native): the board element cut out by xpath, the component
 * rendered at the same width with the board's text. `frame` is the background behind it
 * (`surface` for a control that sits in a card); `fill` stretches it to the width.
 */
const COMPONENTS = [
  { id: 'button-primary', board: 'Cart', xpath: "//button[contains(@style,'#E8384A 0%')]", name: 'Button', fill: true, props: { label: 'اطلب عروض الصيدليات', variant: 'primary', size: 'lg', fullWidth: true } },
  { id: 'button-outline-md', board: 'RxUpload', xpath: "//button[normalize-space()='الصور']", name: 'Button', frame: 'surface', props: { label: 'الصور', variant: 'outline', size: 'md', startIcon: 'image' } },
  { id: 'iconbutton-outlined', board: 'Settings', xpath: "//button[@aria-label='رجوع']", name: 'IconButton', props: { name: 'caret-right', label: 'رجوع', variant: 'outlined' } },
  { id: 'segmented-md', board: 'Settings', xpath: "(//*[@role='radiogroup'])[1]", name: 'Segmented', fill: true, props: { label: 'المظهر', value: 'auto', options: [{ value: 'auto', label: 'تلقائي' }, { value: 'light', label: 'فاتح' }, { value: 'dark', label: 'غامق' }] } },
  { id: 'toggle-on', board: 'Settings', xpath: "(//*[@role='switch'])[1]", name: 'Toggle', frame: 'surface', props: { label: 'حالة الطلبات والمواعيد', value: true } },
  { id: 'radio', board: 'Settings', xpath: "//button[.//span[normalize-space()='العربية']]", name: 'Radio', frame: 'surface', fill: true, props: { label: 'العربية', meta: 'Arabic', selected: true, divider: true } },
  { id: 'chip-selected', board: 'Search', xpath: "(//button[@role='tab'])[1]", name: 'Chip', props: { label: 'الكل', count: '[N]', selected: true } },
  { id: 'statuschip', board: 'Orders', xpath: "//span[normalize-space()='في الطريق']", name: 'StatusChip', frame: 'surface', props: { label: 'في الطريق', tone: 'coral' } },
  { id: 'search-page', board: 'Search', xpath: "//label[.//input[@aria-label='بحث']]", name: 'Search', fill: true, props: { variant: 'page', value: 'باراسيتامول', label: 'بحث', onClear: true, clearLabel: 'مسح', onScanPress: true, scanLabel: 'ماسح الأدوية' } },
  { id: 'stepper', board: 'Cart', xpath: "(//button[@aria-label='إنقاص'])[1]/parent::div", name: 'Stepper', frame: 'surface', props: { value: 1, min: 0, label: 'الكمية', decrementLabel: 'إنقاص', incrementLabel: 'زيادة' } },
];
for (const k of COMPONENTS) {
  COMPARISONS.push({
    id: k.id, board: k.board, themes: ['light'], element: k.xpath,
    crop: () => ({}),
    data: () => ({}),
    // handlers cannot cross into the page as JSON: `true` marks a callback prop the component needs to show its button
    cmp: (box, _data, theme) => ({ kind: 'component', theme, name: k.name, frame: k.frame, fill: k.fill, width: Math.ceil(box.width), props: k.props }),
    note: `${k.name} from packages/ui-native, rendered through react-native-web at the board element's width.`,
  });
}

mkdirSync(OUT, { recursive: true });
const browser = await playwright.chromium.launch();
const done = [];
for (const c of COMPARISONS) {
  for (const theme of c.themes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
    await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: boardFaces }));
    await page.goto(`${BASE}/${c.board}.dc.html${theme === 'dark' ? '?theme=dark' : ''}`);
    await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.fonts.ready);
    let box;
    let boardPng;
    const data = await page.evaluate(c.data);
    if (c.element) {
      const el = page.locator(`xpath=${c.element}`).first();
      box = await el.boundingBox();
      boardPng = (await el.screenshot()).toString('base64');
    } else {
      box = await page.evaluate(c.crop);
      await page.setViewportSize({ width: 390, height: Math.ceil(box.y + box.height) + 10 });
      boardPng = (await page.screenshot({ clip: { x: 0, y: box.y, width: 390, height: box.height } })).toString('base64');
    }
    const shownWidth = c.element ? Math.ceil(box.width) : 390;

    errors.length = 0; // the board's own template (pre-render {{…}} paths) is not ours to report
    await page.setContent(
      `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>${appFaces}html,body{margin:0}</style>` +
        `<div id="root"></div><script>window.__CMP=${JSON.stringify(c.cmp(box, data, theme))}</script><script src="${BASE}/__app.js"></script></html>`,
      { waitUntil: 'load' },
    );
    await page.waitForSelector('#frame', { timeout: 8000 }).catch(async () => { throw new Error(`${c.id}/${theme}: shell did not render: ${errors.join('; ')} ${(await page.content()).slice(0, 300)}`); });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const compPng = (await page.locator('#frame').screenshot()).toString('base64');
    if (errors.length) throw new Error(`${c.id}/${theme}: ${errors.join('; ')}`);

    await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px system-ui;background:#888;display:inline-block}
      .row{display:flex;gap:24px;padding:20px;align-items:flex-start}.col{display:grid;gap:8px;justify-items:start}
      .col b{color:#fff}.col img{display:block;width:${shownWidth}px;border-radius:6px}em{color:#eee;padding:0 20px 16px;display:block;max-width:804px}</style>
      <div class="row"><div class="col"><b>Board: ${c.board} (${theme})</b><img src="data:image/png;base64,${boardPng}"></div>
      <div class="col"><b>Native ${c.element ? 'component' : 'shell'}, react-native-web (${theme})</b><img src="data:image/png;base64,${compPng}"></div></div><em>${c.note}</em>`);
    const file = `native-${c.id}-${theme}.png`;
    await page.locator('body').screenshot({ path: join(OUT, file) });
    done.push(file);
    await page.close();
  }
}
await browser.close();
server.close();
const readme = join(OUT, 'README.md');
const prev = existsSync(readme) ? readFileSync(readme, 'utf8').replace(/\n## Native shells[\s\S]*$/, '\n') : '# Board ↔ component comparisons\n';
writeFileSync(
  readme,
  `${prev.trimEnd()}\n\n## Native shells\n\nGenerated by \`node tools/design/compare-native.mjs\`. Left: the board strip or element. Right: the shell or component from \`packages/ui-native\` through react-native-web.\n\n${done.map((f) => `- [${f}](${f})`).join('\n')}\n`,
);
console.log(`compare-native: wrote ${done.length} comparison(s) to docs/design/compare/`);
