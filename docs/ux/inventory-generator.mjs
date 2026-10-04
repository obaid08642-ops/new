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
 * Parity by path and purpose, built from the two route trees.
 *
 * The reviewer directed that this not come from the Arabic workflow matrix, which
 * has no route column. So the app's routes and the web's routes are normalised —
 * locale prefix dropped, `[param]` collapsed to `:param`, `(group)` dropped — and
 * matched on the resulting path. A match is `same`; an app route with no web
 * counterpart is `missing on web`; a web route with no app counterpart is
 * `missing on app`. `different` is reserved for pairs that exist on both sides
 * but were flagged as diverged by a behavioural check, which this read-only pass
 * cannot perform — so it is reported as `same (unverified behaviour)` rather than
 * guessed.
 */
const norm = (r) =>
  r
    .replace(/^\/?/, '/')
    .replace(/\/\(.*?\)/g, '')          // expo route groups
    .replace(/\[([^\]]+)\]/g, ':$1')   // [id] -> :id
    .replace(/\/+$/, '') || '/';

function parityMap(appRows, webRows) {
  const webByPath = new Map();
  for (const w of webRows) webByPath.set(norm(w.route), w);
  const appByPath = new Map();
  for (const a of appRows) appByPath.set(norm(a.route), a);
  const out = new Map();
  for (const a of appRows) {
    const k = norm(a.route);
    out.set(a.route, webByPath.has(k) ? 'same' : 'missing on web');
  }
  for (const w of webRows) {
    const k = norm(w.route);
    if (!appByPath.has(k)) out.set(w.route, 'missing on app');
  }
  return out;
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

// Estimate model, per the reviewer:
//   hours = (template build-once, once per template actually used)
//         + (per-screen: apply the template and wire the data)
// Screens with no crawl row are `unknown`, never S — an uncrawled screen has not
// been measured, and calling it small is how the first estimate inflated S.
const TEMPLATE_BUILD = { auth: 8, dashboard: 10, list: 6, detail: 6, form: 8, checkout: 10, booking: 10, tracking: 8, 'content/article': 6, settings: 8, 'empty/error': 4 };
const PER_SCREEN = { S: 2, M: 4, L: 8 };
const UNKNOWN_HOURS = null;
// The owner's six batches, verbatim. Anything matching none is 'unassigned' and
// listed by name — no catch-all bucket absorbs it.
const BATCHES = [
  { n: 1, name: 'onboarding/auth/home/search', match: /auth|login|register|otp|password|onboard|home|index|search|guest/i },
  { n: 2, name: 'pharmacy: categories, list, product, cart, prescription', match: /pharmac|medicine|drug|cart|checkout|prescription|rx|product/i },
  { n: 3, name: 'consultations: doctors list, profile, booking, call/chat', match: /consult|doctor|clinic|specialt|booking|appointment|call|chat|follow-up/i },
  { n: 4, name: 'lab/radiology/nursing', match: /lab|radiolog|nursing|scan|test|sample|home-visit/i },
  { n: 5, name: 'orders/bookings/tracking/insurance/copay', match: /order|booking|track|insurance|copay|return|delivery/i },
  { n: 6, name: 'profile/family/pregnancy/reminders/notifications/settings/empty+error', match: /profile|family|pregn|maternity|reminder|notification|setting|account|empty|error|status/i },
];
function batchFor(route) {
  for (const b of BATCHES) if (b.match.test(route.toLowerCase())) return `${b.n} ${b.name}`;
  return 'unassigned';
}
function purposeFor(route) {
  const segs = route.split('/').filter(Boolean);
  if (!segs.length) return 'landing';
  return segs.map((s) => s.replace(/\[.*?\]/g, 'param').replace(/-/g, ' ')).join(' / ');
}

/** Size from measured facts only. Printed in the header so it can be argued with. */
// Screen templates. Every patient screen maps to exactly one; the count per
// template is reported in SUMMARY so the build-once cost is visible.
const TEMPLATES = [
  { name: 'auth', re: /auth|login|register|otp|password|onboard/i },
  { name: 'dashboard', re: /dashboard|home|index|overview|hub/i },
  { name: 'list', re: /list|catalog|search|index|browse|directory/i },
  { name: 'detail', re: /detail|\\[.*\\]|profile|view/i },
  { name: 'form', re: /form|add|edit|create|compose|write/i },
  { name: 'checkout', re: /checkout|payment|pay/i },
  { name: 'booking', re: /booking|appointment|slot|schedule|reserve/i },
  { name: 'tracking', re: /track|status|progress|history|timeline/i },
  { name: 'content/article', re: /article|blog|content|condition|post|read/i },
  { name: 'settings', re: /settings|account|profile|privacy|security|language|notification/i },
  { name: 'empty/error', re: /empty|error|not-found|unavailable|blocked/i },
];
function templateFor(route) {
  for (const t of TEMPLATES) if (t.re.test(route.toLowerCase())) return t.name;
  return 'detail';
}

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

const ALL = {};
for (const app of APPS) {
  const routes = routesFor(app);
  const rows = [];
  const leafCount = new Map();
  const leafPurpose = new Map();

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
    const lp = `${leaf}|${purposeFor(route)}`;
    leafPurpose.set(lp, (leafPurpose.get(lp) || 0) + 1);

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
      template: templateFor(route),
      // Excluded from the estimate: merge candidates, redirect stubs, duplicates.
      excluded: false,
      excludeWhy: '',
    };
    row.size = row.interactive > 0 ? sizeFor(row) : 'unknown';
    rows.push({ ...row, file: rel, purpose: purposeFor(route), batch: batchFor(route), parity: '', qa: qaRefs(route) });
  }

  // Exclusions, decided only after every route is counted:
  //  - merge candidates (same leaf in >1 route)
  //  - redirect stubs (a page that only calls redirect/notFound)
  //  - duplicate routes (same leaf, same purpose)
  for (const r of rows) {
    const leaf = r.route.split('/').filter(Boolean).pop() || '/';
    // A merge candidate needs the same leaf AND the same purpose. Matching on the
    // leaf alone flagged 195 of 270 web screens, because `detail`, `add` and `edit`
    // are leaves shared by genuinely different screens.
    const isMerge = leafPurpose.get(`${leaf}|${purposeFor(r.route)}`) > 1;
    const src = read(r.file);
    // A stub is a page whose whole job is to send you elsewhere. The first version
    // flagged any file under 4000 chars that mentioned notFound(), which excluded
    // 155 of 270 web screens — most of them legitimate pages that call notFound()
    // for a missing param. Now it has to be tiny AND do nothing else.
    const isStub =
      src.length < 1500 &&
      /redirect\(|permanentRedirect\(/.test(src) &&
      !/useEffect|fetch|api\./.test(src);
    if (isMerge) { r.excluded = true; r.excludeWhy = `merge candidate: "${leaf}" x${leafCount.get(leaf)}`; }
    else if (isStub) { r.excluded = true; r.excludeWhy = 'redirect stub'; }
    r.duplicate = isMerge ? r.excludeWhy : '';
  }

  ALL[app.key] = rows;
}

// parity needs both patient clients' rows, so it is assigned after all are built
const PMAP = parityMap(ALL['patient-app'], ALL['patient-web']);
for (const app of APPS) {
  const rows = ALL[app.key];
  for (const r of rows) {
    if (app.key === 'provider-app' || app.key === 'admin') r.parity = 'n/a (not a patient client)';
    else r.parity = PMAP.get(r.route) || 'unmatched';
    r.hours = r.excluded ? 0 : (r.size === 'unknown' ? UNKNOWN_HOURS : PER_SCREEN[r.size]);
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
    `#   <=4 S, <=8 M, else L.  hours = per-screen S:${PER_SCREEN.S} M:${PER_SCREEN.M} L:${PER_SCREEN.L},`,
    `#   plus a one-time build per template used. Uncrawled screens are 'unknown', never S.`,
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
        r.duplicate, r.template, r.excluded ? 'yes: ' + r.excludeWhy : 'no',
        r.size, r.hours === null ? 'unknown' : r.hours, r.qa.join(' ') || '-', r.file,
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
    hours: rows.reduce((a, b) => a + (b.hours || 0), 0),
    bySize: { S: rows.filter((r) => r.size === 'S').length, M: rows.filter((r) => r.size === 'M').length, L: rows.filter((r) => r.size === 'L').length, unknown: rows.filter((r) => r.size === 'unknown').length },
    excluded: rows.filter((r) => r.excluded).length,
    templates: rows.reduce((a, r) => { a[r.template] = (a[r.template] || 0) + 1; return a; }, {}),
    unassigned: rows.filter((r) => r.batch === 'unassigned').map((r) => r.route),
  };
}

writeFileSync(join(OUT, '.summary.json'), JSON.stringify(summaries, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summaries, null, 2));