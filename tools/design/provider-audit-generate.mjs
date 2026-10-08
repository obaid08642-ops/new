#!/usr/bin/env node
/**
 * Provider-app element audit, step 2 of 2 (step 1 is `node tools/design/screen-inventory.mjs`, which writes
 * docs/design/inventory/provider-screens.json and provider-elements.json).
 *
 *   node tools/design/provider-audit-generate.mjs          writes docs/design/audit/provider-<area>.json (one per area)
 *   node tools/design/audit-table.mjs docs/design/audit/provider-<area>.json --provider     then writes the .md and
 *                                                           docs/design/needs-review/provider-<area>.json
 *   node tools/design/provider-audit-generate.mjs --check  fails when an audit JSON is stale against the inventory
 *
 * The element rows are produced by the static analysis in provider-inventory.mjs (buttons, inputs, lists, numbers; what each one
 * does) and are NOT hand-written; reviewed false positives live in docs/design/inventory/provider-audit-overrides.json, so a
 * regenerated file keeps the human verdicts. Every non-ok row becomes one Needs-review line with file:line.
 * Ambulance screens get an `owner` line: the owner decided to remove the ambulance system (OWNER_DECISIONS_2026-10-06.md, O-2).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = process.argv.includes('--check');
const rows = JSON.parse(readFileSync(join(REPO, 'docs/design/inventory/provider-screens.json'), 'utf8')).routes;
const els = JSON.parse(readFileSync(join(REPO, 'docs/design/inventory/provider-elements.json'), 'utf8')).screens;
const AREAS = ['auth-onboarding', 'doctor', 'pharmacy', 'lab', 'radiology', 'nursing', 'facility', 'shared', 'admin-ish', 'ambulance'];
const OWNER_REMOVED = (r) => r.area === 'ambulance' || /^(FleetScreen|HospitalDispatchScreen|SosDispatchScreen)$/.test(r.component);
const MAX_OK = 100000;
// hand-verified findings the static analysis cannot see (read the file, confirmed the line): docs/design/inventory/provider-audit-manual.json
const manual = existsSync(join(REPO, 'docs/design/inventory/provider-audit-manual.json')) ? JSON.parse(readFileSync(join(REPO, 'docs/design/inventory/provider-audit-manual.json'), 'utf8')) : [];
// runtime check (tools/design/runtime-check-api.mjs --app provider): provider endpoints that answer a PATIENT session with 200
const runtime = existsSync(join(REPO, 'docs/design/inventory/provider-runtime.json')) ? JSON.parse(readFileSync(join(REPO, 'docs/design/inventory/provider-runtime.json'), 'utf8')).findings : [];
const guardPaths = new Map(runtime.filter((f) => /^REVIEW/.test(f.verdict)).map((f) => [f.path, f]));
const guardDone = new Set();
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);

const stale = [];
const summary = {};
for (const area of AREAS) {
  const screens = [];
  const needs = [];
  for (const r of rows.filter((x) => x.area === area)) {
    const list = els[r.route] ?? [];
    const elements = [];
    const bad = [...list, ...manual.filter((m) => m.route === r.route).map((m) => ({ kind: 'text', label: m.element, src: m.src, status: m.status, file: m.file, line: m.line, note: m.note }))].filter((e) => e.status !== 'ok');
    const ok = list.filter((e) => e.status === 'ok' && !e.untraced);
    const untraced = list.filter((e) => e.untraced);
    const name = (e) => `${e.kind === 'text' ? '' : e.kind + ': '}${clip(e.label, 60)}${e.via ? ` (in ${e.via})` : ''}`;
    for (const e of bad) {
      elements.push([name(e), clip(e.src, 120), e.status]);
      if (e.note) needs.push({ route: r.route, element: clip(e.label, 60), kind: 'client', note: clip(e.note, 200), file: e.file, line: e.line });
    }
    for (const e of ok.slice(0, MAX_OK)) elements.push([name(e), clip(e.src, 120), 'ok']);
    for (const e of untraced.slice(0, 6)) elements.push([name(e), clip(e.src, 120), 'ok']);
    const text = elements.map((e) => e[1]).join('\n');
    for (const c of r.calls.filter((c) => !text.includes(c.path.split('?')[0]))) elements.push([`API: ${c.method} ${c.path}`, `${c.method} ${c.path} (${c.status}${c.backend ? `, ${c.backend}` : ''})`, c.status === 'OK' || c.status === 'PARTIAL' ? 'ok' : 'broken']);
    for (const c of r.calls.filter((c) => c.status !== 'OK' && c.status !== 'PARTIAL')) needs.push({ route: r.route, element: `API ${c.method} ${c.path}`, kind: 'backend', note: `Endpoint is ${c.status}${c.note ? ` (${c.note})` : ''}.`, file: c.file, line: c.line, backend: c.backend });
    for (const n of r.navIssues) {
      if (bad.some((e) => e.file === n.file && e.line === n.line)) continue;
      elements.push([`Navigate → ${n.target}`, `${n.target} is not registered in the ${n.roles.join('/')} navigator`, 'broken']);
      needs.push({ route: r.route, element: `Navigate → ${n.target}`, kind: 'client', note: `Target screen "${n.target}" is not registered in the ${n.roles.join('/')} navigator, so the tap does nothing.`, file: n.file, line: n.line });
    }
    for (const c of r.calls) {
      if (c.method !== 'GET' || !guardPaths.has(c.path) || guardDone.has(c.path)) continue;
      guardDone.add(c.path);
      needs.push({ route: r.route, element: `API GET ${c.path}`, kind: 'backend', note: 'Runtime check: a seeded PATIENT session gets 200 on this provider endpoint; verify its role guard (leads, not verdicts).', file: c.file, line: c.line, backend: c.backend });
    }
    if (OWNER_REMOVED(r)) {
      const reg = r.registrations[0];
      needs.push({ route: r.route, element: 'Ambulance feature', kind: 'owner', note: 'Owner decision O-2 (2026-10-06) removes the ambulance system and provider type; this screen goes with it.', file: r.file, line: r.line });
      void reg;
    }
    const notes = [];
    if (!r.calls.length) notes.push('No API call at all (static screen or all data comes from a parent).');
    if (!list.length) notes.push('No tracked elements: thin wrapper or purely static layout.');
    if (untraced.length) notes.push(`${untraced.length} list(s) fed by a parent prop are not traced across components.`);
    screens.push({ route: r.route, elements, ...(notes.length ? { notes } : {}) });
  }
  const seen = new Set();
  const dedup = needs.filter((n) => { const k = `${n.route}|${n.file}|${n.line}|${n.element}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const cnt = { ok: 0, 'not wired': 0, dead: 0, mock: 0, placeholder: 0, broken: 0 };
  for (const sc of screens) for (const e of sc.elements) cnt[e[2]]++;
  const areaRows = rows.filter((x) => x.area === area);
  summary[area] = { screens: areaRows.length, calls: areaRows.reduce((t, x) => t + x.calls.length, 0), noApi: areaRows.filter((x) => !x.calls.length).map((x) => x.route), cnt, needs: dedup };
  const out = { slice: `provider-${area}`, batch: 'provider', app: 'provider-app', screens, needsReview: dedup };
  const path = join(REPO, `docs/design/audit/provider-${area}.json`);
  const json = JSON.stringify(out, null, 1) + '\n';
  if (CHECK) { if (!existsSync(path) || readFileSync(path, 'utf8') !== json) stale.push(path); } else writeFileSync(path, json);
}
// roll-up
{
  const L = [];
  const all = AREAS.flatMap((a) => summary[a].needs.map((n) => ({ ...n, area: a })));
  const tot = (k) => AREAS.reduce((t, a) => t + summary[a].cnt[k], 0);
  L.push('# Provider app audit summary', '', '_Generated by `tools/design/provider-audit-generate.mjs` from `docs/design/inventory/provider-*.json`. Read-only audit: nothing was fixed; the provider app is not redesigned (owner rule)._', '');
  L.push(`Screens: ${rows.length} (React Navigation components rendered by a navigator; ${rows.reduce((t, r) => t + r.registrations.length, 0)} registrations). Endpoint pairs: ${rows.reduce((t, r) => t + r.calls.length, 0)}, all matched against the backend controllers (NO_ROUTE ${rows.flatMap((r) => r.calls).filter((c) => c.status === 'NO_ROUTE').length}, WRONG_METHOD ${rows.flatMap((r) => r.calls).filter((c) => c.status === 'WRONG_METHOD').length}). Elements audited: ${AREAS.reduce((t, a) => t + Object.values(summary[a].cnt).reduce((x, y) => x + y, 0), 0)} (${tot('ok')} ok, ${tot('not wired')} not wired, ${tot('dead')} dead, ${tot('mock')} mock, ${tot('placeholder')} placeholder, ${tot('broken')} broken). Needs-review lines: ${all.length}.`, '');
  L.push('## Per area', '', '| Area | Screens | Endpoint pairs | Elements ok | not wired | dead | mock | placeholder | broken | Needs review (client / backend / owner) |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const a of AREAS) {
    const m = summary[a];
    const k = (x) => m.needs.filter((n) => n.kind === x).length;
    L.push(`| ${a} | ${m.screens} | ${m.calls} | ${m.cnt.ok} | ${m.cnt['not wired']} | ${m.cnt.dead} | ${m.cnt.mock} | ${m.cnt.placeholder} | ${m.cnt.broken} | ${k('client')} / ${k('backend')} / ${k('owner')} |`);
  }
  L.push('', 'Element counts are rows of `docs/design/audit/provider-<area>.md` (full list in `inventory/provider-elements.json`; hand-verified extras in `inventory/provider-audit-manual.json`). A component registered in several navigators is counted once, under the area that owns its file (`admin-ish` = `shared/blueprint/*`, `shared` = `shared/*`).', '');
  L.push('## Top problems', '', '| # | Area | Screen | Problem | Where |', '|---|---|---|---|---|');
  const sev = (n) => (n.kind === 'client' ? (/navigat|no onPress|dead|only changes|without sending|never used|Placeholder|SMP/.test(n.note) ? 0 : 1) : n.kind === 'backend' ? 2 : 3);
  const top = all.slice().sort((a, b) => sev(a) - sev(b) || a.area.localeCompare(b.area)).filter((n) => n.kind !== 'owner').slice(0, 15);
  top.forEach((n, i) => L.push(`| ${i + 1} | ${n.area} | ${n.route} | [${n.kind}] ${String(n.note).replace(/\|/g, '/')} | \`${n.file}:${n.line}\` |`));
  L.push('', '## Screens with no API call at all', '');
  for (const a of AREAS) if (summary[a].noApi.length) L.push(`- ${a}: ${summary[a].noApi.map((x) => `\`${x}\``).join(', ')}`);
  L.push('', 'Reading (each opened and read): `SplashScreen` and `WelcomeScreen` are static by design (they receive callbacks; the sign-in request is in `LoginScreen`, reached through `useAuth().login`); `RadiologySettingsScreen` is a menu of buttons to other screens plus logout; `NurseVisitConsole` is a stub (hard-coded English title and one button); `PharmacyQRMenuScreen` draws a fixed QR icon with no QR value, link or request (placeholder). `PharmacyWalletScreen` is a one-line wrapper of `ProviderWalletScreen` and has its calls.', '');
  L.push('## Runtime check', '', 'See `docs/design/audit/runtime-provider-<area>.md` and `docs/design/inventory/provider-runtime.json`. No provider account could be signed in (the test seeds create `users` and profiles but no `provider_accounts` row, and `POST /provider/auth/login` looks the account up by email). GET calls were therefore run with a seeded PATIENT session and with no session: they prove the routes exist and are guarded (or public), NOT that the provider screens render real data. Provider endpoints that answered the patient session with 200 are listed as `[backend]` leads.', '');
  L.push('## Limits', '', '- Static, heuristic analysis (TypeScript AST): buttons, inputs, lists, stat cards and useState data are traced; a prop-fed list is not traced across components; response field names are not compared with backend DTOs; request bodies are not compared with DTOs.', '- A handler that calls a parent callback (`onSave(...)`) is `ok` here; whether the parent sends the request is covered only when the parent is a separate audited screen.', '- One call is not resolved statically: `provider-app/src/api/catalogs.ts:117` `client.get(SVC_ENDPOINT[type])` (a map to `/labs/services`, `/radiology/services`, `/nursing/catalog`; all three answered 200 at runtime).', '- Screens switched by internal `useState` (sub-views inside one component) are one screen here.', '- Reviewed false positives are recorded in `docs/design/inventory/provider-audit-overrides.json` (8 entries) and hand-found extras in `docs/design/inventory/provider-audit-manual.json` (2 entries).', '');
  const path = join(REPO, 'docs/design/PROVIDER_AUDIT_SUMMARY.md');
  const md = L.join('\n');
  if (CHECK) { if (!existsSync(path) || readFileSync(path, 'utf8') !== md) stale.push(path); } else writeFileSync(path, md);
}
if (CHECK) {
  if (stale.length) { for (const p of stale) console.error(`stale: ${p}: run node tools/design/provider-audit-generate.mjs and audit-table.mjs --provider`); process.exit(1); }
  console.log('provider-audit-generate: check ok');
} else console.log(`provider-audit-generate: wrote ${AREAS.length} area files`);
