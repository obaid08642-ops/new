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
import { loadCss } from './load-css.mjs';
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
const componentsCss = loadCss(join(HERE, 'components/components.css'));

/**
 * id        output name
 * board     board file (without .dc.html); query: board props (e.g. theme=dark)
 * xpath     the element to cut out of the board
 * themes    which themes to render (the board must accept `theme` for dark)
 * render    the component, with the board's text
 * frame     'canvas' (default), 'card' (the component sits in a white card on the board) or
 *           'surface' (a plain card-coloured background, for a control cut out of a card), or
 *           'screen' (the board's whole phone screen, the component centred in it)
 * expandTop also keep this many px above the element (content that overflows upward)
 * needs     component names that must exist in this build (else the entry is skipped)
 * viewport  page width for both sides (default 430; desktop boards use 1440)
 * inject    true: render(C, inner) also gets the board element's own children (HTML), so a
 *           (or a function run on the element in the page that returns the HTML to use)
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
  // ---- components 2/4: controls
  {
    id: 'button-primary', board: 'Cart', xpath: "//button[contains(@style,'#E8384A 0%')]", themes: ['light'],
    render: (C) => h(C.Button, { label: 'اطلب عروض الصيدليات', variant: 'primary', size: 'lg', fullWidth: true }), needs: ['Button'],
    note: 'Gradient top is #E62337, the board\'s #E8384A darkened to give the white label 4.5:1 (tokens, owner rule 2026-10-04).',
  },
  {
    id: 'button-outline-md', board: 'RxUpload', xpath: "//button[normalize-space()='الصور']", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Button, { label: 'الصور', variant: 'outline', size: 'md', startIcon: 'image' }), needs: ['Button'],
  },
  {
    id: 'button-outline-sm', board: 'Account', xpath: "//button[normalize-space()='تعديل']", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Button, { label: 'تعديل', variant: 'outline', size: 'sm' }), needs: ['Button'],
  },
  {
    id: 'iconbutton-outlined', board: 'Settings', xpath: "//button[@aria-label='رجوع']", themes: ['light'],
    render: (C) => h(C.IconButton, { name: 'caret-right', label: 'رجوع', variant: 'outlined' }), needs: ['IconButton'],
    note: 'Glyph: Phosphor caret (the line set) for the board\'s stroked chevron.',
  },
  {
    id: 'iconbutton-filter', board: 'Consult', xpath: "//button[@aria-label='تصفية']", themes: ['light'],
    render: (C) => h(C.IconButton, { name: 'sliders', label: 'تصفية', variant: 'filled', shape: 'square', size: 'lg' }), needs: ['IconButton'],
  },
  {
    id: 'segmented-md', board: 'Settings', xpath: "(//*[@role='radiogroup'])[1]", themes: ['light'],
    render: (C) => h(C.Segmented, { label: 'المظهر', value: 'auto', options: [{ value: 'auto', label: 'تلقائي' }, { value: 'light', label: 'فاتح' }, { value: 'dark', label: 'غامق' }] }), needs: ['Segmented'],
  },
  {
    id: 'segmented-sm', board: 'Orders', xpath: "(//*[@role='radiogroup'])[1]", themes: ['light'],
    render: (C) => h(C.Segmented, { label: 'الطلبات', size: 'sm', value: 'now', options: [{ value: 'now', label: 'الحالية' }, { value: 'past', label: 'السابقة' }] }), needs: ['Segmented'],
  },
  {
    id: 'toggle-on', board: 'Settings', xpath: "(//*[@role='switch'])[1]", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Toggle, { label: 'حالة الطلبات والمواعيد', value: true }), needs: ['Toggle'],
  },
  {
    id: 'toggle-off', board: 'RxUpload', xpath: "(//*[@role='switch'])[1]", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Toggle, { label: 'استخدم تأميني', value: false }), needs: ['Toggle'],
  },
  {
    id: 'radio', board: 'Settings', xpath: "//button[.//span[normalize-space()='العربية']]", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Radio, { label: 'العربية', meta: 'Arabic', selected: true, divider: true }), needs: ['Radio'],
  },
  {
    id: 'radio-off', board: 'Settings', xpath: "//button[.//span[normalize-space()='English']]", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Radio, { label: 'English', meta: 'English', selected: false, divider: true }), needs: ['Radio'],
  },
  {
    id: 'chip-selected', board: 'Search', xpath: "(//button[@role='tab'])[1]", themes: ['light'],
    render: (C) => h(C.Chip, { label: 'الكل', count: '[N]', selected: true }), needs: ['Chip'],
    note: 'Board placeholder [N]; the component shows a real count or none.',
  },
  {
    id: 'chip', board: 'Search', xpath: "(//button[@role='tab'])[2]", themes: ['light'],
    render: (C) => h(C.Chip, { label: 'أدوية', count: '[N]' }), needs: ['Chip'],
  },
  {
    id: 'statuschip', board: 'Orders', xpath: "//span[normalize-space()='في الطريق']", themes: ['light'], frame: 'surface',
    render: (C) => h(C.StatusChip, { label: 'في الطريق', tone: 'coral' }), needs: ['StatusChip'],
    note: 'Ink is the tone\'s service fg (4.5:1 on its bg, checked) for the board\'s #B81E2B.',
  },
  {
    id: 'statuschip-done', board: 'Orders', xpath: "//span[normalize-space()='تم التوصيل']", themes: ['light'], frame: 'surface',
    render: (C) => h(C.StatusChip, { label: 'تم التوصيل', tone: 'mint' }), needs: ['StatusChip'],
  },
  {
    id: 'search-filter', board: 'Consult', xpath: "//label[.//input[contains(@placeholder,'طبيب')]]/parent::div", themes: ['light'],
    render: (C) => h(C.Search, { placeholder: 'ابحث عن طبيب أو تخصص…', onFilterPress: () => {}, filterLabel: 'تصفية' }), needs: ['Search'],
  },
  {
    id: 'search-scan', board: 'PharmacyHub', xpath: "//label[.//input[contains(@placeholder,'المادة')]]", themes: ['light'],
    render: (C) => h(C.Search, { placeholder: 'ابحث بالاسم أو المادة الفعالة…', onScanPress: () => {}, scanLabel: 'مسح الباركود' }), needs: ['Search'],
  },
  {
    id: 'search-page', board: 'Search', xpath: "//label[.//input[@aria-label='بحث']]", themes: ['light'],
    render: (C) => h(C.Search, { variant: 'page', value: 'باراسيتامول', label: 'بحث', onClear: () => {}, clearLabel: 'مسح', onScanPress: () => {}, scanLabel: 'ماسح الأدوية' }), needs: ['Search'],
    note: 'The scan button uses the handoff barcode glyph for the board\'s stroked scan frame.',
  },
  {
    id: 'stepper', board: 'Cart', xpath: "(//button[@aria-label='إنقاص'])[1]/parent::div", themes: ['light'], frame: 'surface',
    render: (C) => h(C.Stepper, { value: 1, min: 0, label: 'الكمية', decrementLabel: 'إنقاص', incrementLabel: 'زيادة' }), needs: ['Stepper'],
  },
  // ---- components 3/4: cards
  {
    id: 'doctorcard', board: 'Consult', xpath: "(//a[.//span[normalize-space()='احجز']])[1]", themes: ['light'],
    render: (C) => h(C.DoctorCard, {
      name: 'د. [اسم الطبيب]', verifiedLabel: 'موثّق', availableLabel: 'متاح الآن', grade: '[الدرجة: استشاري / أخصائي]', specialty: '[التخصص الدقيق]',
      place: '[اسم المستشفى أو العيادة] · [المسافة] كم', tone: 'blue',
      modes: [{ mode: 'clinic', label: 'عيادة' }, { mode: 'home', label: 'منزلي' }, { mode: 'online', label: 'أونلاين' }],
      rating: { value: 4.8, count: 128 }, nextSlot: 'اليوم [الوقت]', price: '[السعر]', currency: 'ر.س', bookLabel: 'احجز',
    }),
    needs: ['DoctorCard'],
    note: 'Board placeholders: the photo ([صورة الطبيب]; the component shows the real photo or the neutral mark) and the rating ([N.N] ([العدد]); the component renders real numbers or nothing).',
  },
  {
    id: 'productcard', board: 'PharmacyHub', xpath: "(//a[.//button[@aria-label='أضف للسلة']])[1]", themes: ['light'],
    render: (C) => h(C.ProductCard, { name: '[اسم المنتج] [التركيز]', meta: '[الشركة] · [العبوة]', price: '[السعر]', currency: 'ر.س', discountLabel: 'خصم [٪]', addLabel: 'أضف للسلة' }),
    needs: ['ProductCard'], note: 'Board placeholder [صورة المنتج]; the component shows the product image, or the pill mark when there is none.',
  },
  {
    id: 'productcard-rx', board: 'PharmacyHub', xpath: "(//a[.//button[@aria-label='أضف للسلة']])[3]", themes: ['light'],
    render: (C) => h(C.ProductCard, { name: '[اسم المنتج] [التركيز]', meta: '[الشركة] · [العبوة]', price: '[السعر]', currency: 'ر.س', rxLabel: 'يحتاج وصفة', addLabel: 'أضف للسلة' }),
    needs: ['ProductCard'],
  },
  {
    id: 'offercard', board: 'HomeApp', xpath: "(//a[.//span[normalize-space()='[اسم العرض أو الباقة]']])[1]", themes: ['light', 'dark'],
    render: (C) => h(C.OfferCard, { title: '[اسم العرض أو الباقة]', provider: '[مقدم الخدمة]', price: '[السعر]', currency: 'ر.س', was: '[قبل الخصم]', tag: 'باقة', icon: 'test-tube', tone: 'blue' }),
    needs: ['OfferCard'],
  },
  {
    id: 'timeline', board: 'OrderTracking', xpath: "//div[contains(@style,'border-radius: 24px')][.//span[normalize-space()='تم قبول الطلب']]", themes: ['light'],
    inject: (n) => n.firstElementChild.outerHTML,
    render: (C, inner) => h(C.Card, { padding: 'md' }, h('div', { dangerouslySetInnerHTML: { __html: inner } }), h(C.Timeline, {
      label: 'حالة الطلب',
      steps: [
        { id: 'a', label: 'تم قبول الطلب', time: '[الوقت]', state: 'done' },
        { id: 'b', label: 'جارٍ التجهيز', time: '[الوقت]', state: 'done' },
        { id: 'c', label: 'في الطريق إليك', time: 'الآن', state: 'current' },
        { id: 'd', label: 'تم التوصيل', state: 'upcoming' },
      ],
    })),
    needs: ['Card', 'Timeline'], note: 'Card + Timeline; the ETA row above the steps is the board\'s own (screen content).',
  },
  {
    id: 'card-tint-progressring', board: 'CareHub', xpath: "//div[contains(@style,'border-radius: 28px')][.//*[name()='circle']]", themes: ['light'],
    inject: (n) => n.lastElementChild.outerHTML,
    render: (C, inner) => h(C.Card, { tint: 'pink', padding: 'lg', elevation: 'flat' }, h('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
      h(C.ProgressRing, { value: 0.55, tone: 'pink', label: 'أسبوع الحمل', valueText: '[٢٢]', caption: 'أسبوع' }),
      h('div', { dangerouslySetInnerHTML: { __html: inner } }))),
    needs: ['Card', 'ProgressRing'],
    note: 'Card tint=pink + ProgressRing; the text beside the ring is the board\'s own. The ring track is the pink tone\'s soft colour (#FFE7F1) for the board\'s #FBD9E8.',
  },
  // ---- components 4/4: states and the main tab bar
  {
    id: 'tabbar', board: 'HomeApp', xpath: "//nav[@aria-label='التنقل الرئيسي']", themes: ['light', 'dark'], expandTop: 40,
    render: (C) => h(C.BottomTabBar, { label: 'التنقل الرئيسي', value: 'home', items: [
      { id: 'home', label: 'الرئيسية', icon: 'house' }, { id: 'pharmacy', label: 'الصيدلية', icon: 'pill' },
      { id: 'consult', label: 'الاستشارات', icon: 'stethoscope', raised: true }, { id: 'labs', label: 'التحاليل', icon: 'test-tube' },
      { id: 'nursing', label: 'التمريض', icon: 'first-aid-kit' },
    ] }), needs: ['BottomTabBar'],
  },
  {
    id: 'emptystate', board: 'States', viewport: 1650, xpath: "//div[contains(@style,'left: 1260px')]", themes: ['light'], frame: 'screen',
    render: (C) => h(C.EmptyState, { icon: 'package', tone: 'coral', title: 'السلة فاضية', body: 'ابحث عن دوائك أو ارفع الروشتة، والصيدليات القريبة تجهزه لك.', actionLabel: 'تصفح الصيدلية', secondaryActionLabel: 'ارفع الروشتة' }),
    needs: ['EmptyState'],
  },
  {
    id: 'errorstate', board: 'States', viewport: 1650, xpath: "//div[contains(@style,'left: 840px')]", themes: ['light'], frame: 'screen',
    render: (C) => h(C.ErrorState, { title: 'ما قدرنا نحمّل الصفحة', body: 'حصلت مشكلة في الاتصال بالخادم. بياناتك محفوظة.', retryLabel: 'إعادة المحاولة' }),
    needs: ['ErrorState'],
  },
  {
    id: 'offlinestate', board: 'States', viewport: 1650, xpath: "//div[contains(@style,'left: 420px')]", themes: ['light'], frame: 'screen',
    render: (C) => h(C.OfflineState, { title: 'لا يوجد اتصال بالإنترنت', body: 'تقدر تشوف طلباتك ومواعيدك المحفوظة، وبنكمل أول ما يرجع الاتصال.', retryLabel: 'إعادة المحاولة' }),
    needs: ['OfflineState'],
  },
  {
    id: 'notfound', board: 'States', viewport: 1650, xpath: "//div[contains(@style,'left: 0px')][contains(@style,'width: 390px')]", themes: ['light'], frame: 'screen',
    render: (C) => h(C.EmptyState, { icon: 'magnifying-glass', tone: 'violet', title: 'الصفحة غير موجودة', body: 'يمكن الرابط قديم أو اتنقل. جرّب البحث أو ارجع للرئيسية.', actionLabel: 'الرئيسية', secondaryActionLabel: 'البحث' }),
    needs: ['EmptyState'], note: 'The 404 screen is an EmptyState with the magnifying glass in violet.',
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
    // expandTop: also keep what overflows above the element (the tab bar's raised button)
    const up = c.expandTop || 0;
    const boardPng = (up
      ? await page.screenshot({ fullPage: true, clip: { x: box.x, y: box.y - up, width: box.width, height: box.height + up } })
      : await el.screenshot()).toString('base64');
    // inject: true = the element's own children; a function = the board HTML it picks (runs in the page)
    const inner = typeof c.inject === 'function' ? await el.evaluate(c.inject) : c.inject ? await el.evaluate((n) => n.innerHTML) : '';
    const boardBg = await page.evaluate(() => getComputedStyle(document.querySelector('#dc-root > *') || document.body).backgroundColor);

    const body = renderToStaticMarkup(c.render(ui, inner));
    const frame =
      c.frame === 'card'
        ? `<div style="border-radius:24px;background:var(--nabd-color-bg-surface);border:1px solid var(--nabd-color-border-hairline);overflow:hidden">${body}</div>`
        : c.frame === 'screen'
          ? `<div style="width:${Math.ceil(box.width)}px;height:${Math.ceil(box.height)}px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;background:var(--nabd-color-bg-canvas)">${body}</div>`
        : c.frame === 'surface'
          ? `<div style="background:var(--nabd-color-bg-surface)">${body}</div>`
        : c.frame === 'coral'
          ? `<div style="padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,var(--nabd-color-action-fab-from),var(--nabd-color-action-fab-to))">${body}</div>`
          : body;
    await page.setContent(
      `<!doctype html><html dir="rtl" lang="ar" data-theme="${theme}"><meta charset="utf-8"><style>${fontFaces}${tokensCss}${shellsCss}${componentsCss}
      body{margin:0;background:var(--nabd-color-bg-canvas);font-family:'Readex Pro',system-ui,sans-serif;color:var(--nabd-color-text-primary)}
      #c{display:inline-block;padding:0;padding-top:${up}px;inline-size:${Math.ceil(box.width)}px}</style><body><div id="c">${frame}</div></body></html>`,
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
// keep the section tools/design/compare-native.mjs writes (the native shells)
const readmePath = join(OUT, 'README.md');
const nativeSection = existsSync(readmePath) ? (readFileSync(readmePath, 'utf8').match(/\n## Native shells[\s\S]*$/) || [''])[0] : '';
writeFileSync(readmePath, `# Board ↔ component comparisons\n\nGenerated by \`node packages/ui/build-compare.mjs\`. Left: the element cut out of the board (rendered by \`docs/design/canvas/support.js\`). Right: the real component with the same text, theme, width and direction.\n\n${done.map((f) => `- [${f}](${f})`).join('\n')}\n${nativeSection}`);
console.log(`build-compare: wrote ${done.length} comparison(s) to docs/design/compare/`);
