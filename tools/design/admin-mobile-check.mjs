#!/usr/bin/env node
/**
 * Admin phone / desktop layout check with a STUBBED session (no real login, no backend).
 *
 *   cd admin && npx next build && npx next start -p 3111 &
 *   node tools/design/admin-mobile-check.mjs --base http://127.0.0.1:3111 [--pages today,approvals] [--widths 390,1024]
 *
 * What is real: the production Next server, the page code, the browser (Chromium), layout and behaviour.
 * What is stubbed: the session (fake `admin_access` + `admin_csrf` cookies) and every `/api/admin/**` call
 * (page.route fixtures below; unknown endpoints answer an empty list-shaped object). Page DATA is therefore not
 * real: this checks layout, tables-as-cards, tap targets, the drawer and the request each button sends.
 *
 * Per page and width (320, 360, 390, 768, 1024, 1440): no horizontal page overflow; below 768 px every table is a
 * card table (data-cards) or scrolls inside its own box, 44 px tap targets and 16 px inputs inside <main>; from
 * 768 px tables render as tables; the drawer button is visible below 1024 px and hidden from 1024 px.
 * Then scenario checks (medicine quick edit + confirm, barcode dialog, provider reject / request-changes,
 * approvals queue, today screen, feature switch button).
 *
 * Needs `playwright` (PLAYWRIGHT_PATH or the global install) and a Chromium (PLAYWRIGHT_BROWSERS_PATH).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('base', 'http://127.0.0.1:3111');
const WIDTHS = arg('widths', '320,360,390,768,1024,1440').split(',').map(Number);

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  const cands = [process.env.PLAYWRIGHT_PATH, '/opt/node-tools/node_modules/playwright', join(REPO, 'admin/node_modules/playwright'), 'playwright'].filter(Boolean);
  for (const c of cands) { try { return req(c); } catch { /* next */ } }
  console.error('playwright not found: set PLAYWRIGHT_PATH'); process.exit(2);
}
const { chromium } = loadPlaywright();

// ---------------------------------------------------------------- fixtures
const guardSource = readFileSync(join(REPO, 'admin/src/components/AdminGuard.tsx'), 'utf8');
const PERMISSIONS = [...new Set([...guardSource.matchAll(/'([a-z_]+(?:\.[a-z_]+)+)'/g)].map((m) => m[1]))];

const order = (i) => ({ id: `ord-${i}`, kind: 'pharmacy', status: 'CONFIRMED', created_at: '2026-10-07T10:00:00Z', patient: { id: 'p1', name: 'مريض تجريبي', phone: '0500000000' }, provider: { id: 'pr1', name: 'صيدلية تجريبية' }, amount: 120 + i, currency: 'ر.س', sla_due_at: '2026-10-08T10:00:00Z' });
const medicine = (i, extra = {}) => ({ id: `med-${i}`, name_ar: `دواء تجريبي ${i}`, name_en: `Test drug ${i}`, category: 'مسكنات', active_ingredient: 'paracetamol', price: 10 + i, requires_prescription: false, availability_status: 'none', medical_review_status: 'approved', public_eligibility: true, barcode: `62812345678${i}`, ...extra });

const FIXTURES = [
  [/\/admin\/session$/, () => ({ user: { id: 'a1', role: 'super_admin', full_name: 'مدير تجريبي' }, permissions: PERMISSIONS })],
  [/\/command-center-v2$/, () => ({ ts: new Date().toISOString(), tiles: { orders_active: 12, labs_active: 3, radiology_active: 2, nursing_active: 1, appointments_today: 9, sos_open: 0, tickets_open: 4, revenue_24h_sar: 15230, payments_24h: 31, sla_breach_total: 2 } })],
  [/\/ops\/alerts$/, () => ({ stuck_minutes_threshold: 30, stuck_orders: [{ kind: 'pharmacy', id: 'ord-1', state: 'QUOTED' }, { kind: 'lab', id: 'lab-7', state: 'CONFIRMED' }], stuck_count: 2, failed_payments: [{ id: 'tx1', booking_kind: 'pharmacy', booking_id: 'ord-1', amount: 80, status: 'failed' }], failed_count: 1 })],
  [/\/ops\/overview$/, () => ({ today: { total_requests: 1200, success: 1180, client_errors: 15, server_errors: 5, success_rate: 98.3 } })],
  [/\/ops\/domain-metrics$/, () => ({ pharmacy: { fill_rate_pct: 87, ordered: 100, filled: 87 }, consultations: { no_show: 3, no_show_rate_pct: 4 }, nursing: { by_state: { NEW: 1 } } })],
  [/\/finance\/withdrawals\/pending$/, () => ({ data: [{ id: 'wd-100000000001', providerName: 'مزود تجريبي', amount: 500, iban: 'SA0380000000608010167519', source: 'provider_ops', createdAt: '2026-10-07T09:00:00Z' }, { id: 'wd-100000000002', providerName: 'مزود آخر', amount: 90, iban: 'SA0380000000608010167520', createdAt: '2026-10-07T09:30:00Z' }] })],
  [/\/orders(\?|$)/, () => ({ data: [order(1), order(2)], total: 2, page: 1, pages: 1 })],
  [/\/medicines\/lookup-barcode$/, () => ({ found: false, source: 'none', medicine: null, codes_tried: ['6281234567890'] })],
  [/\/medicines\/admin\/catalog\/[^/]+\/price-history/, () => ({ data: [{ id: 'h1', before_price: 9, after_price: 11, reason: 'تحديث سعر المورد', createdAt: '2026-10-01T10:00:00Z' }], total: 1, page: 1, pages: 1 })],
  [/\/medicines\/admin\/catalog(\?|$)/, (url) => (new URL(url).searchParams.get('q') === 'none' ? { data: [], total: 0 } : { data: [medicine(1), medicine(2, { medical_review_status: 'pending', public_eligibility: false, requires_prescription: true })], total: 2 })],
  [/\/medicines\/admin\/change-requests/, () => ({ data: [], total: 3, page: 1, total_pages: 1 })],
  [/\/medicines\/admin\/shortage-reports/, () => ({ data: [], total: 5, counts: {} })],
  [/\/medicines\/admin\/image-suggestions/, () => ({ data: [], total: 1 })],
  [/\/providers\/provider-deltas$/, () => []],
  [/\/admin\/providers\?status=pending/, () => ({ items: [{ id: 'acc-1', display_name_ar: 'عيادة تجريبية', provider_type: 'doctor', email: 'x@example.com', status: 'pending', createdAt: '2026-10-07T08:00:00Z' }], total: 1 })],
  [/\/admin\/providers\/acc-1$/, () => ({ account: { id: 'acc-1' }, profile: {}, documents: [], bank_accounts: [] })],
  [/\/finance\/refunds\/queue$/, () => []],
  [/\/returns\?/, () => []],
  [/\/(labs|radiology|nursing)\/admin\/catalog$/, () => [{ id: 'c1', name_ar: 'فحص', medical_review_status: 'pending' }, { id: 'c2', name_ar: 'فحص 2', medical_review_status: 'approved' }]],
];
const EMPTY = { data: [], items: [], rows: [], total: 0, page: 1, pages: 1, summary: {}, counts: {} };

// ---------------------------------------------------------------- pages
const PAGES = (arg('pages', '') ? arg('pages', '').split(',') : [
  // checked in the first mobile PR
  'audit-logs', 'locations', 'rbac', 'price-override-audit', 'command-center', 'users-management', 'catalog-manager', 'payouts',
  'finance-suite', 'disputes', 'dashboard', 'legal-policies', 'orders', 'crm', 'provider-moderation',
  // migrated to DataTable in this step
  'search-intelligence', 'analytics', 'shortage-reports', 'gdpr', 'reports', 'financial-ledger', 'insurance-queue', 'pharmacy-procurement',
  'system-ops', 'medicines-catalog', 'scheduled-reports', 'order-detail', 'config-portal', 'fraud-monitoring',
  'commissions', 'notification-center', 'analytics-suite', 'ai-control', 'health-dashboard',
  // new mobile essentials
  'today', 'approvals',
]);

const results = [];
const fail = (page, width, what) => results.push({ page, width, what });
let checks = 0;
const ok = (cond, page, width, what) => { checks += 1; if (!cond) fail(page, width, what); };

async function newContext(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < 1024, isMobile: width < 768, locale: 'ar-SA' });
  const host = new URL(BASE).hostname;
  await context.addCookies([
    { name: 'admin_access', value: 'stub', domain: host, path: '/' },
    { name: 'admin_csrf', value: 'stub-csrf', domain: host, path: '/' },
  ]);
  const requests = [];
  await context.route('**/api/admin/**', async (route) => {
    const req = route.request();
    const url = req.url();
    requests.push({ method: req.method(), url, body: req.postData() || '' });
    if (url.includes('/stream')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' });
    const hit = FIXTURES.find(([re]) => re.test(url));
    const body = hit ? hit[1](url) : (req.method() === 'GET' ? EMPTY : { ok: true });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { context, requests };
}

async function layoutChecks(page, name, width) {
  const m = await page.evaluate((w) => {
    const root = document.documentElement;
    const main = document.querySelector('main') || document.body;
    const tables = [...main.querySelectorAll('table')].map((t) => ({
      cards: t.hasAttribute('data-cards'),
      display: getComputedStyle(t).display,
      scrolls: t.parentElement && ['auto', 'scroll'].includes(getComputedStyle(t.parentElement).overflowX),
      selfScrolls: ['auto', 'scroll'].includes(getComputedStyle(t).overflowX),
    }));
    const small = [];
    if (w < 768) {
      for (const el of main.querySelectorAll('button, a[href], select, summary, input:not([type=hidden]):not([type=checkbox]):not([type=radio])')) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (el.closest('[inert],[aria-hidden="true"]')) continue;
        if (r.height < 43.5) small.push(`${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}:${Math.round(r.height)}`);
        if (/INPUT|SELECT|TEXTAREA/.test(el.tagName) && parseFloat(cs.fontSize) < 15.9) small.push(`font:${el.tagName.toLowerCase()}:${cs.fontSize}`);
      }
    }
    const burger = document.querySelector('button[aria-controls="admin-nav"]');
    const burgerVisible = !!burger && getComputedStyle(burger).display !== 'none' && burger.getBoundingClientRect().width > 0;
    const aside = document.querySelector('aside')?.getBoundingClientRect();
    const mainBox = document.querySelector('main')?.getBoundingClientRect();
    // closed drawer fully outside the viewport (< 1024); desktop sidebar beside <main>, not on top of it (>= 1024)
    const drawerOff = !!aside && (aside.right <= 0 || aside.left >= window.innerWidth);
    const sidebarBeside = !!aside && !!mainBox && (aside.left >= mainBox.right - 1 || aside.right <= mainBox.left + 1);
    return { overflow: root.scrollWidth - window.innerWidth, tables, small: small.slice(0, 6), burgerVisible, drawerOff, sidebarBeside, denied: /غير مصرح/.test(document.body.innerText) };
  }, width);
  ok(m.overflow <= 1, name, width, `horizontal page overflow ${m.overflow}px`);
  ok(!m.denied, name, width, 'permission panel shown (stub permissions incomplete)');
  for (const t of m.tables) {
    if (width < 768) ok(t.cards || t.scrolls || t.selfScrolls, name, width, 'table is neither a card table nor scrollable');
    else if (t.cards) ok(t.display === 'table', name, width, `card table not rendered as table (display ${t.display})`);
  }
  ok(m.small.length === 0, name, width, `small tap targets / inputs: ${m.small.join(', ')}`);
  ok(m.burgerVisible === (width < 1024), name, width, `drawer button visible=${m.burgerVisible}`);
  if (width < 1024) ok(m.drawerOff, name, width, 'closed drawer is partly visible on screen');
  else ok(m.sidebarBeside, name, width, 'desktop sidebar overlaps the page content');
}

async function scenario(name, browser, width, fn) {
  const { context, requests } = await newContext(browser, width);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
  try { await fn(page, requests); }
  catch (e) {
    fail(name, width, `scenario threw: ${String(e.message).split('\n')[0]}`);
    // SHOT_DIR=<dir> keeps a temporary screenshot of a failing scenario (never committed).
    if (process.env.SHOT_DIR) await page.screenshot({ path: join(process.env.SHOT_DIR, `${name.replace(/\W+/g, '-')}-${width}.png`) }).catch(() => undefined);
  }
  ok(errors.length === 0, name, width, `page errors: ${errors.join(' | ')}`);
  await context.close();
}

const browser = await chromium.launch();
const warnings = [];

// 1. layout sweep
for (const width of WIDTHS) {
  for (const name of PAGES) {
    const { context } = await newContext(browser, width);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 100)));
    try {
      await page.goto(`${BASE}/admin/${name}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('main', { timeout: 15000 });
      await page.waitForTimeout(500);
      await layoutChecks(page, name, width);
    } catch (e) { fail(name, width, `did not load: ${String(e.message).split('\n')[0]}`); }
    if (errors.length) warnings.push(`${name}@${width}: ${errors[0]}`);
    await context.close();
  }
}

// 2. behaviour scenarios (390 = phone, 1280 = desktop)
for (const width of [390, 1280]) {
  await scenario('medicines-catalog quick edit', browser, width, async (page, requests) => {
    await page.goto(`${BASE}/admin/medicines-catalog`);
    await page.getByRole('button', { name: 'تعديل سريع' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'تعديل سريع' });
    await dialog.waitFor();
    ok((await dialog.innerText()).includes('11'), 'medicines-catalog quick edit', width, 'price change log not shown');
    await dialog.getByLabel('السعر (ر.س)').fill('12.5');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    ok(await page.getByRole('alert').filter({ hasText: 'سبب تغيير السعر' }).isVisible(), 'medicines-catalog quick edit', width, 'price change without a reason was not stopped');
    await dialog.getByLabel(/سبب تغيير السعر/).fill('تحديث سعر المورد الجديد');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    const confirm = page.getByRole('dialog', { name: 'تأكيد التغيير' });
    await confirm.waitFor();
    const text = await confirm.innerText();
    ok(text.includes('11') && text.includes('12.5') && text.includes('يتطلب وصفة طبية') && text.includes('منشور'), 'medicines-catalog quick edit', width, `confirm dialog lacks old -> new / published warning: ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
    ok(!requests.some((r) => r.method === 'PATCH'), 'medicines-catalog quick edit', width, 'saved before confirmation');
    await confirm.getByRole('button', { name: 'تراجع' }).click();
    ok(await dialog.isVisible(), 'medicines-catalog quick edit', width, 'cancel closed the quick edit');
    ok(!requests.some((r) => r.method === 'PATCH'), 'medicines-catalog quick edit', width, 'cancel still saved');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await page.getByRole('dialog', { name: 'تأكيد التغيير' }).getByRole('button', { name: 'نعم، احفظ' }).click();
    await page.waitForTimeout(400);
    const patch = requests.find((r) => r.method === 'PATCH');
    ok(!!patch && /med-1/.test(patch.url), 'medicines-catalog quick edit', width, 'no PATCH to the item after confirm');
    const body = patch ? JSON.parse(patch.body) : {};
    ok(body.price === 12.5 && body.requires_prescription === true && body.reason === 'تحديث سعر المورد الجديد' && !('controlled' in body), 'medicines-catalog quick edit', width, `unexpected PATCH body ${patch?.body}`);
    ok(!(await page.getByText('controlled', { exact: false }).count()), 'medicines-catalog quick edit', width, 'a controlled control is visible');
  });

  await scenario('medicines-catalog availability only', browser, width, async (page, requests) => {
    await page.goto(`${BASE}/admin/medicines-catalog`);
    await page.getByRole('button', { name: 'تعديل سريع' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'تعديل سريع' });
    await dialog.getByLabel('التوفر').selectOption('discontinued');
    await dialog.getByRole('button', { name: 'حفظ' }).click();
    await page.waitForTimeout(400);
    ok(requests.some((r) => r.method === 'POST' && /med-1\/availability$/.test(r.url) && /discontinued/.test(r.body)), 'medicines-catalog availability only', width, 'availability POST missing');
    ok(!requests.some((r) => r.method === 'PATCH'), 'medicines-catalog availability only', width, 'availability change used PATCH (would un-publish)');
  });

  await scenario('medicines-catalog barcode', browser, width, async (page, requests) => {
    await page.goto(`${BASE}/admin/medicines-catalog`);
    await page.getByRole('button', { name: /الباركود/ }).first().click();
    const dialog = page.getByRole('dialog', { name: 'مسح الباركود' });
    await dialog.waitFor();
    ok(await dialog.getByText(/غير مدعوم|تعذر فتح الكاميرا|جارٍ فتح الكاميرا/).isVisible(), 'medicines-catalog barcode', width, 'no camera status message');
    await dialog.getByLabel('رمز الباركود').fill('6281234567890');
    await dialog.getByRole('button', { name: 'بحث' }).click();
    await page.waitForTimeout(600);
    ok(requests.some((r) => r.method === 'POST' && /lookup-barcode$/.test(r.url) && /6281234567890/.test(r.body)), 'medicines-catalog barcode', width, 'lookup-barcode not called');
    ok(requests.some((r) => r.method === 'GET' && /catalog\?.*q=6281234567890/.test(r.url)), 'medicines-catalog barcode', width, 'catalogue not searched by the code');
  });

  await scenario('provider-moderation reject', browser, width, async (page, requests) => {
    const prompts = [];
    page.on('dialog', async (d) => { prompts.push(d.message()); if (d.type() === 'prompt') await d.accept('مستند الترخيص غير واضح'); else await d.accept(); });
    await page.goto(`${BASE}/admin/provider-moderation`);
    await page.getByText('عيادة تجريبية').first().click();
    await page.getByRole('button', { name: /Request changes/ }).click();
    await page.waitForTimeout(400);
    const rc = requests.find((r) => /acc-1\/request-changes$/.test(r.url));
    ok(!!rc && rc.method === 'POST' && JSON.parse(rc.body).note === 'مستند الترخيص غير واضح', 'provider-moderation reject', width, `request-changes call wrong: ${rc?.body}`);
    await page.getByText('عيادة تجريبية').first().click().catch(() => undefined);
  });
  await scenario('provider-moderation reject (final)', browser, width, async (page, requests) => {
    page.on('dialog', async (d) => { if (d.type() === 'prompt') await d.accept('بيانات مخالفة للشروط'); else await d.accept(); });
    await page.goto(`${BASE}/admin/provider-moderation`);
    await page.getByText('عيادة تجريبية').first().click();
    await page.getByRole('button', { name: /Reject/ }).click();
    await page.waitForTimeout(400);
    const rj = requests.find((r) => /acc-1\/reject$/.test(r.url));
    ok(!!rj && rj.method === 'POST' && JSON.parse(rj.body).reason === 'بيانات مخالفة للشروط', 'provider-moderation reject (final)', width, `reject call wrong: ${rj?.body}`);
  });

  await scenario('provider-moderation approve form', browser, width, async (page, requests) => {
    let prompts = 0;
    page.on('dialog', async (d) => { prompts += 1; await d.dismiss(); });
    await page.goto(`${BASE}/admin/provider-moderation`);
    await page.getByText('عيادة تجريبية').first().click();
    await page.getByRole('button', { name: /Approve Provider/ }).click();
    const dialog = page.getByRole('dialog', { name: 'اعتماد المزود' });
    await dialog.waitFor();
    ok(await dialog.getByText('عيادة تجريبية').isVisible(), 'provider-moderation approve form', width, 'summary missing');
    await dialog.getByRole('button', { name: 'تأكيد الاعتماد' }).click();
    ok(await dialog.getByRole('alert').isVisible(), 'provider-moderation approve form', width, 'short reason not rejected inline');
    await dialog.locator('textarea').fill('وثائق مكتملة ومطابقة');
    await dialog.getByRole('button', { name: 'تأكيد الاعتماد' }).click();
    await page.waitForTimeout(400);
    const ap = requests.find((r) => /acc-1\/approve$/.test(r.url));
    const body = ap ? JSON.parse(ap.body) : {};
    ok(!!ap && ap.method === 'POST' && body.reason === 'وثائق مكتملة ومطابقة' && body.commission_cash === 10 && body.commission_insurance === 10, 'provider-moderation approve form', width, `approve call wrong: ${ap?.body}`);
    ok(prompts === 0, 'provider-moderation approve form', width, 'a window dialog was used');
  });

  await scenario('approvals', browser, width, async (page) => {
    await page.goto(`${BASE}/admin/approvals`);
    await page.getByRole('heading', { name: 'بانتظار موافقتي' }).waitFor();
    await page.waitForTimeout(600);
    const text = await page.locator('main').innerText();
    ok(/مزودون جدد/.test(text) && /طلبات سحب المزودين/.test(text) && /مراجعة طبية للكتالوج/.test(text), 'approvals', width, 'rows missing');
    ok(/عنصراً بانتظار قرار/.test(text), 'approvals', width, 'total line missing');
    // withdrawals fixture has 2, change requests 3, shortage 5, images 1, providers 1, catalogue review 3 (one per list)
    const rows = await page.locator('li').allInnerTexts();
    const countOf = (label) => (rows.find((r) => r.includes(label)) || '').match(/[\d٠-٩]+\s*$/)?.[0];
    ok(/2|٢/.test(countOf('طلبات سحب المزودين') || ''), 'approvals', width, `withdrawal count ${countOf('طلبات سحب المزودين')}`);
    ok(/5|٥/.test(countOf('بلاغات نقص الأدوية') || ''), 'approvals', width, `shortage count ${countOf('بلاغات نقص الأدوية')}`);
  });

  await scenario('approvals failing row', browser, width, async (page) => {
    await page.route('**/finance/withdrawals/pending', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"x"}' }));
    await page.goto(`${BASE}/admin/approvals`);
    await page.waitForTimeout(800);
    ok(await page.getByRole('button', { name: /تعذر التحميل/ }).count() === 1, 'approvals failing row', width, 'failed row did not show a retry button (or showed a fake zero)');
  });

  await scenario('today', browser, width, async (page) => {
    await page.goto(`${BASE}/admin/today`);
    await page.getByRole('heading', { name: 'اليوم' }).waitFor();
    await page.waitForTimeout(600);
    const text = await page.locator('main').innerText();
    ok(/تجاوز مهلة الخدمة/.test(text) && /عالق/.test(text) && /مدفوعات فاشلة/.test(text), 'today', width, 'urgent alerts missing');
    ok(await page.locator('a[href="/admin/orders/pharmacy/ord-1"]').count() >= 1, 'today', width, 'problem order link missing');
    ok(/طلبات نشطة/.test(text) && /15|١٥/.test(text), 'today', width, 'tiles missing');
  });

  await scenario('payouts inline reject row', browser, width, async (page) => {
    await page.goto(`${BASE}/admin/payouts`);
    await page.getByRole('button', { name: 'رفض' }).first().click();
    ok(await page.getByPlaceholder('سبب الرفض (يظهر للمزود)').isVisible(), 'payouts inline reject row', width, 'inline reject form not shown');
    await page.getByRole('button', { name: 'تراجع' }).click();
    ok(await page.getByPlaceholder('سبب الرفض (يظهر للمزود)').count() === 0, 'payouts inline reject row', width, 'inline reject form not closed');
  });
}

await browser.close();

console.log(`checks: ${checks}, failures: ${results.length}`);
for (const r of results) console.log(`FAIL ${r.page} @${r.width}: ${r.what}`);
if (warnings.length) { console.log(`\nstub-shape page errors (informational, ${warnings.length}):`); for (const w of warnings.slice(0, 30)) console.log(`  ${w}`); }
process.exit(results.length ? 1 : 0);
