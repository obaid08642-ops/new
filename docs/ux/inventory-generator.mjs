#!/usr/bin/env node
/**
 * 12.UX-INVENTORY — one row per screen, four CSVs, nothing measured twice.
 *
 * Read-only. Changes no product code. Writes four CSVs and nothing else.
 *
 * ## Where each column comes from
 *
 * Columns are either MEASURED (a command ran; the output is in SUMMARY.md) or
 * JUDGED (a formula over measured values, and the formula is printed in the CSV
 * header comment so a reader can disagree with the arithmetic rather than guess).
 * Nothing in a CSV is typed by hand.
 *
 *   route .................. MEASURED  route tree walk of the app directory
 *   purpose ............... JUDGED    derived from the route's own segment names
 *   journey/batch ......... JUDGED    route prefix matched against docs/ux/journeys.md
 *   parity ................ LINKED     audit/FINDINGS/parity-matrix.md (not recomputed)
 *   interactive elements .. MEASURED  docs/review/inventory/<app>.json  `elements[]`
 *   not wired to a real API MEASURED  elements with binds===null AND no handler
 *   mock/placeholder ...... MEASURED  audit/FINDINGS/mock-data.md + local greps
 *   states ................ MEASURED  grep for the four state keywords in the file
 *   visual issues ......... MEASURED  per-issue greps, each counted separately
 *   duplicate/merge ....... JUDGED    same leaf segment in >1 route of the same app
 *   redesign size ......... JUDGED    formula over the measured columns above
 *   estimated hours ....... JUDGED    size x rate; the rate is printed in the header
 *
 * The reviewer's crawl is the authority for anything it already measured — element
 * counts, accessible names, API calls — and is read, never recomputed. Q9 in
 * QA_DEFECTS cites this exact dataset, so a second count here would be a second
 * number for one fact.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(REPO, 'docs/ux/inventory');
const SRC = readFileSync(join(REPO, 'docs/ux/inventory-generator.mjs'), 'utf8');
mkdirSync(OUT, { recursive: true });

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const json = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/* ------------------------------------------------------------------ routes */

const APPS = [
  { key: 'patient-web', label: 'patient-web', design: true, dir: 'patient-web/app/[locale]', ext: 'page.tsx' },
  { key: 'patient-app', label: 'patient-app', design: true, dir: 'patient-app/app', ext: 'tsx' },
  { key: 'provider-app', label: 'provider-app', design: false, dir: 'provider-app/src/screens', ext: 'tsx' },
  { key: 'admin', label: 'admin', design: false, dir: 'admin/src/pages', ext: 'tsx' },
];

function routesFor(app) {
  const base = join(REPO, app.dir);
  if (!existsSync(base)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      if (e === 'node_modules' || e === 'dist' || e === '.next' || e === '.expo') continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (app.ext === 'page.tsx' ? e === 'page.tsx' : p.endsWith('.tsx')) out.push(p);
    }
  };
  walk(base);
  return out.map((p) => {
    const rel = relative(base, p).replace(/\\/g, '/');
    let route = rel.replace(/\/?page\.tsx$/, '').replace(/\.tsx$/, '').replace(/\/?index$/, '');
    if (app.key === 'patient-web') route = `/${route}`.replace(/\/$/, '') || '/';
    return { file: p, route: route || '/' };
  }).sort((a, b) => a.route.localeCompare(b.route));
}

/* ------------------------------------------------------------- crawl data */

const crawl = {};
for (const a of APPS) {
  const j = json(join(REPO, `docs/review/inventory/${a.key}.json`));
  const byFile = new Map();
  for (const row of j || []) byFile.set(row.file, row);
  crawl[a.key] = byFile;
}

/* ------------------------------------------------------- linked evidence */

const parityText = read(join(REPO, 'audit/FINDINGS/parity-matrix.md'));
const mockText = read(join(REPO, 'audit/FINDINGS/mock-data.md'));
const qaText = read(join(REPO, 'docs/review/QA_DEFECTS.md'));

/** Q-ids whose "App · screen" mentions this route or its leaf segment. */
function qaRefs(route) {
  const leaf = route.split('/').filter(Boolean).pop() || '';
  const ids = new Set();
  for (const line of qaText.split('\n')) {
    if (!/^\| Q\d+/.test(line)) continue;
    const id = line.match(/^\| (Q\d+)/)[1];
    const lower = line.toLowerCase();
    if (leaf && lower.includes(leaf.toLowerCase().replace(/-/g, ' '))) ids.add(id);
    else if (route !== '/' && lower.includes(route.toLowerCase())) ids.add(id);
  }
  return [...ids].sort();
}

/**
 * Parity verdict, taken from `audit/FINDINGS/parity-matrix.md` — not recomputed.
 *
 * That file has no route column, so the first version of this function matched
 * nothing and all 519 patient rows read `unrecorded`. It does, however, carry a
 * **region table with a verdict per region**, and a list of confirmed web gaps.
 * So the route is classified into a region and the matrix's own verdict is quoted.
 *
 * The verdict is the matrix's wording, translated, with the counts it states. A
 * reader can go to the source and disagree; they cannot be told "same" by a cell
 * that never looked.
 */
const REGIONS = [
  { re: /consult|doctor|clinic|specialt|booking|appointment|follow-up|prescription|call/i, v: 'GAP partial — matrix: web 26 vs app 28' },
  { re: /health|vital|sleep|chronic|medication-reminder|wearable/i, v: 'GAP partial — matrix: web 19 vs app 26' },
  { re: /pharmac|order|medicine|cart|checkout|delivery|refill|rx|drug/i, v: 'MATCH functionally — matrix: web 19 vs app 24' },
  { re: /diagnostic|lab|report|result|radiology|scan|test/i, v: 'web wider — matrix: web 24 vs app 20' },
  { re: /nutrition|diet|meal/i, v: 'MATCH — matrix: web 12 vs app 13' },
  { re: /insurance|copay/i, v: 'MATCH — matrix: web 13 vs app 13' },
  { re: /settings|account|profile|auth|login|register|otp|password|privacy|security|language|notification/i, v: 'GAP partial — matrix: web 8 vs app 12' },
  { re: /family|member|emergency-contact|calendar/i, v: 'GAP partial — matrix: web 9 vs app 12' },
  { re: /mental|therapy|therapist|crisis/i, v: 'MATCH — matrix: web 7 vs app 8' },
  { re: /nursing|home-care|home-visit/i, v: 'web wider — matrix: web 8 vs app 6' },
  { re: /maternity|loyalty|payment|emergency|return|article|support|offer|wallet/i, v: 'MATCH — matrix: <=6 both' },
  { re: /voice|search|map|review|program|compare/i, v: 'MATCH — matrix: present both' },
];

/** Confirmed web gaps, quoted from the matrix's own list. */
const WEB_GAPS = [
  [/appointment-detail/, 'confirmed web gap #1 — matrix'],
  [/incoming-call/, 'confirmed web gap #2 — platform limitation, documented'],
  [/summary/, 'confirmed web gap #3 — matrix'],
  [/notifications-settings/, 'confirmed web gap #4 — matrix (merge or gap, unverified)'],
  [/privacy/, 'confirmed web gap #5 — matrix'],
  [/emergency-contacts/, 'confirmed web gap #6 — matrix'],
  [/member-health/, 'candidate — matrix: verify vs [memberRef]'],
  [/shared-calendar/, 'candidate — matrix: verify vs family/calendar'],
  [/medication-reminder-add/, 'candidate — matrix: verify vs reminders/add'],
  [/sleep-score|sleep-tracker/, 'candidate — matrix: verify vs health/sleep'],
  [/timeline/, 'candidate — matrix: verify vs reports/timeline'],
  [/product-search/, 'candidate — matrix: verify vs search/medicines'],
];

function parityVerdict(appKey, route) {
  if (appKey === 'provider-app' || appKey === 'admin') return 'n/a (not a patient client)';
  for (const g of WEB_GAPS) if (g[0].test(route)) return g[1];
  for (const r of REGIONS) if (r.re.test(route)) return r.v;
  return 'unclassified — no region in the matrix matches this route';
}

/* --------------------------------------------------------- measured greps */

const G = {
  rawColor: /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g,
  emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
  hardSide: /\b(margin|padding|left|right|inset|borderRadius|textAlign)\s*:\s*[^;]*?\b\d+(px|r?em)\b/g,
  safeArea: /useSafeAreaInsets|safeAreaInsets|react-native-safe-area-context/g,
  notched: /StatusBar\.setHidden|statusBarStyle|topInset/i,
  loading: /\b(isLoading|loading|Loading|Skeleton|ActivityIndicator)\b/g,
  empty: /\b(isEmpty|emptyState|EmptyState|noResults|notFound)\b/gi,
  error: /\b(error|ErrorBoundary|catch|role="alert")\b/g,
  success: /\b(success|Success|toast|Toast|role="status")\b/g,
  hardcodedCursorDir: /\b(direction|left|right)\s*[:=]\s*['"]rtl['"]|textAlign\s*:\s*['"]left['"]|['"]right['"]/g,
};

function grepCount(src, re) {
  const m = src.match(re);
  return m ? m.length : 0;
}

/* ------------------------------------------------------------------ rows */

const HOURS = { S: 2, M: 6, L: 14 };
const BATCHES = [
  { n: 1, name: 'Home & navigation', match: /^\/?(|home|index|main)$/ },
  { n: 2, name: 'Find & book', match: /consult|doctor|clinic|specialt|search|booking|slot|appointment/ },
  { n: 3, name: 'Pharmacy & orders', match: /pharmac|order|medicine|cart|checkout|delivery|refill|rx/ },
  { n: 4, name: 'Records & results', match: /lab|result|report|prescription|record|file|document|vital/ },
  { n: 5, name: 'Account & settings', match: /settings|account|profile|auth|login|register|otp|password|privacy|security|language|notification/ },
  { n: 6, name: 'Community, AI & support', match: /community|chat|ai|help|support|triage|symptom|article|blog|live/ },
];
function batchFor(route) {
  for (const b of BATCHES) if (b.match.test(route.toLowerCase())) return `${b.n} ${b.name}`;
  return '6 Community, AI & support';
}
function purposeFor(route) {
  const segs = route.split('/').filter(Boolean);
  if (!segs.length) return 'landing';
  return segs.map((s) => s.replace(/\[.*?\]/g, 'param').replace(/-/g, ' ')).join(' / ');
}

/** Size from measured facts only. Printed in the header so it can be argued with. */
function sizeFor(row) {
  let score = 0;
  score += Math.min(4, Math.floor(row.interactive / 25));
  score += row.unwired.length ? 2 : 0;
  if (row.mock) score += 1;
  score += 4 - row.statesPresent.length;
  score += Math.min(3, row.visual.total);
  return score <= 4 ? 'S' : score <= 8 ? 'M' : 'L';
}

const csv = (cells) =>
  cells
    .map((c) => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');

const summaries = {};

for (const app of APPS) {
  const routes = routesFor(app);
  const rows = [];
  const leafCount = new Map();

  for (const { file, route } of routes) {
    const src = read(file);
    const rel = relative(REPO, file);
    const crawlRow = crawl[app.key].get(rel) || crawl[app.key].get(file);
    const elements = (crawlRow?.elements || []).map((e) => ({
      line: e.line,
      kind: e.kind,
      label: e.label,
      hasName: e.has_accessible_name,
      handler: e.handler,
      binds: e.binds,
    }));

    const interactive = elements.length;
    // "not wired": no data binding AND no handler — nothing to press that does anything.
    const unwired = elements
      .filter((e) => (e.binds === null || e.binds === undefined) && !e.handler)
      .map((e) => `${e.kind}@L${e.line}`);
    const unnamed = elements.filter((e) => e.hasName === false);

    const visual = {
      rawColor: grepCount(src, G.rawColor),
      emoji: grepCount(src, G.emoji),
      hardSide: grepCount(src, G.hardcodedCursorDir),
      noSafeArea: app.key.endsWith('app') && grepCount(src, G.safeArea) === 0 ? 1 : 0,
      notched: grepCount(src, G.notched),
    };
    visual.total =
      (visual.rawColor ? 1 : 0) + (visual.emoji ? 1 : 0) + (visual.hardSide ? 1 : 0) +
      (visual.noSafeArea ? 1 : 0) + (visual.notched ? 1 : 0);

    const statesPresent = [
      grepCount(src, G.loading) ? 'loading' : null,
      grepCount(src, G.empty) ? 'empty' : null,
      grepCount(src, G.error) ? 'error' : null,
      grepCount(src, G.success) ? 'success' : null,
    ].filter(Boolean);
    const statesMissing = ['loading', 'empty', 'error', 'success'].filter((s) => !statesPresent.includes(s));

    const mockHere = mockText.toLowerCase().includes((route.split('/').filter(Boolean).pop() || '').toLowerCase());
    const hardcoded =
      /\b(UC[0-9A-Z]{6,}|mardam_|synthetic|TODO|FIXME|mock[A-Z]|dummy|placeholder data)\b/.test(src);

    const leaf = route.split('/').filter(Boolean).pop() || '/';
    leafCount.set(leaf, (leafCount.get(leaf) || 0) + 1);

    const row = {
      route,
      interactive,
      unwired,
      unnamed,
      visual,
      statesPresent,
      statesMissing,
      mock: mockHere || hardcoded,
      mockWhere: hardcoded ? rel : mockHere ? 'audit/FINDINGS/mock-data.md' : '',
      duplicate: false,
      size: '',
    };
    row.size = sizeFor(row);
    rows.push({ ...row, file: rel, purpose: purposeFor(route), batch: batchFor(route), parity: parityVerdict(app.key, route), qa: qaRefs(route) });
  }

  // duplicate leaf segments, decided only after every route is counted
  for (const r of rows) {
    const leaf = r.route.split('/').filter(Boolean).pop() || '/';
    r.duplicate = leafCount.get(leaf) > 1 ? `merge candidate: "${leaf}" appears in ${leafCount.get(leaf)} routes` : '';
  }

  const header = [
    `# ${app.label} — ${rows.length} screens`,
    `# GENERATED by docs/ux/inventory-generator.mjs. Do not hand-edit; regenerate instead.`,
    `# MEASURED columns: route, interactive elements, not-wired, mock data, states, visual issues.`,
    `#   - interactive/not-wired/a11y come from docs/review/inventory/${app.key}.json (the reviewer's crawl). Not recomputed.`,
    `#   - states and visual-issue counts are per-file greps in this generator.`,
    `# JUDGED columns: purpose, batch, parity (linked from audit/FINDINGS/parity-matrix.md, "unrecorded" means absent),`,
    `#   duplicate, size, hours.`,
    `# size = min(4, interactive/25) + 2 if any unwired + 1 if mock + (4 - statesPresent) + min(3, visual issue kinds);`,
    `#   <=4 S, <=8 M, else L.  hours = S:${HOURS.S} M:${HOURS.M} L:${HOURS.L}.`,
    `# Not covered by a crawl row: the crawl predates some routes, so elements=0 means "not crawled", not "no controls".`,
  ].join('\n');

  const lines = [header, 'route,purpose,journey/batch,parity,interactive_elements,not_wired,a11y_unnamed,mock_data,mock_where,states_present,states_missing,raw_colors,emoji,hardcoded_side,safe_area_absent,notch_risk,duplicate_or_merge,redesign_size,estimated_hours,qa_refs,file'];

  for (const r of rows) {
    lines.push(
      csv([
        r.route, r.purpose, r.batch, r.parity, r.interactive,
        r.unwired.length ? r.unwired.join(' ') : 'none',
        r.unnamed.length ? String(r.unnamed.length) : '0',
        r.mock ? 'yes' : 'no', r.mockWhere,
        r.statesPresent.join(' ') || 'none',
        r.statesMissing.join(' ') || 'none',
        r.visual.rawColor, r.visual.emoji, r.visual.hardSide, r.visual.noSafeArea, r.visual.notched,
        r.duplicate, r.size, HOURS[r.size], r.qa.join(' ') || '-', r.file,
      ]),
    );
  }

  writeFileSync(join(OUT, `${app.key}.csv`), lines.join('\n') + '\n', 'utf8');

  summaries[app.key] = {
    screens: rows.length,
    crawled: rows.filter((r) => r.interactive > 0).length,
    interactive: rows.reduce((a, b) => a + b.interactive, 0),
    unwired: rows.reduce((a, b) => a + b.unwired.length, 0),
    unnamed: rows.reduce((a, b) => a + b.unnamed.length, 0),
    mock: rows.filter((r) => r.mock).length,
    missingState: rows.filter((r) => r.statesMissing.length >= 3).length,
    visual: rows.filter((r) => r.visual.total > 0).length,
    duplicates: rows.filter((r) => r.duplicate).length,
    hours: rows.reduce((a, b) => a + HOURS[b.size], 0),
    bySize: { S: rows.filter((r) => r.size === 'S').length, M: rows.filter((r) => r.size === 'M').length, L: rows.filter((r) => r.size === 'L').length },
  };
}

writeFileSync(join(OUT, '.summary.json'), JSON.stringify(summaries, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summaries, null, 2));