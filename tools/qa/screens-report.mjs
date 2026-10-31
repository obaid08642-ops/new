#!/usr/bin/env node
/**
 * Per-screen wiring report for the provider app and the admin dashboard (owner request 2026-10-31).
 *
 *   node tools/qa/screens-report.mjs            writes docs/qa/provider-screens.json and docs/qa/provider-screens.md
 *   node tools/qa/screens-report.mjs --check    exit 1 if the committed files are stale or any element is not OK/FIXED
 *
 * Source of truth: the static inventories that `node tools/design/screen-inventory.mjs` (which runs provider-inventory.mjs and
 * admin-inventory.mjs) writes under docs/design/inventory/: every screen, every button/field/toggle/list on it, what each one calls, and
 * whether that endpoint exists in a backend controller with that method (provider-screens.json / admin-screens.json `calls`).
 * This script adds no analysis of its own: it re-shapes those facts into one table per screen,
 *     element | wired to | status
 * with the status vocabulary of the owner request:
 *     OK               wired to a real endpoint (or to local logic / navigation / a parent callback) and nothing suspicious found
 *     FIXED            was flagged and fixed (listed in docs/qa/provider-screens-fixed.json with the PR)
 *     MISSING-BACKEND  calls an endpoint the backend does not have (route or method), or the inventory marks the element broken
 *     FLAGGED          the heuristics found a dead handler, mock data or a placeholder that is not in the reviewed list: must be fixed
 * Reviewed false positives are kept in docs/design/inventory/{provider,admin}-audit-overrides.json (file:line, status, reason).
 * Limits: static and heuristic (props passed by a parent are not traced across components; response field names and field validation
 * rules are not compared here: tools/audit/dtocheck.js compares what the clients send with the backend DTOs).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INV = join(REPO, 'docs/design/inventory');
const OUT_JSON = join(REPO, 'docs/qa/provider-screens.json');
const OUT_MD = join(REPO, 'docs/qa/provider-screens.md');
const FIXED_PATH = join(REPO, 'docs/qa/provider-screens-fixed.json');
const CHECK = process.argv.includes('--check');

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const provScreens = readJson(join(INV, 'provider-screens.json'), { routes: [] }).routes;
const provElements = readJson(join(INV, 'provider-elements.json'), { screens: {} }).screens;
const admScreens = readJson(join(INV, 'admin-screens.json'), { routes: [] }).routes;
const admElements = readJson(join(INV, 'admin-elements.json'), { screens: {} }).screens;
const fixed = readJson(FIXED_PATH, {});   // { "file:line": { pr, what } }

function statusOf(e) {
  const key = `${e.file}:${e.line}`;
  if (fixed[key]) return { status: 'FIXED', note: `${fixed[key].pr}: ${fixed[key].what}` };
  switch (e.status) {
    case 'ok': return { status: 'OK', note: e.note || '' };
    case 'broken': return { status: 'MISSING-BACKEND', note: e.note || '' };
    default: return { status: 'FLAGGED', note: `${e.status}${e.note ? `: ${e.note}` : ''}` };
  }
}
// BFF = handled by the admin's own Next.js route (sign-in/out), not a Nest controller: nothing to be missing
const callBad = (c) => !['OK', 'BFF'].includes(String(c.status).toUpperCase()) && c.target !== 'external';

function build(app, screens, elementsBy, screenKey) {
  const rows = [];
  for (const s of screens) {
    const key = screenKey(s);
    const elements = (elementsBy[key] || []).map((e) => ({ element: `${e.kind}: ${String(e.label ?? '').replace(/\s+/g, ' ').slice(0, 80)}`, wired_to: String(e.src ?? ''), file: e.file, line: e.line, ...statusOf(e) }));
    const calls = (s.calls || []).map((c) => ({ method: c.method, path: c.path, status: c.status, backend: c.backend || null, file: c.file, line: c.line }));
    // an endpoint with no backend route is a defect of the screen even when no single element carries it
    for (const c of calls) if (callBad({ status: c.status })) elements.push({ element: `call: ${c.method} ${c.path}`, wired_to: `${c.status}`, file: c.file, line: c.line, status: 'MISSING-BACKEND', note: 'no backend route/method for this call' });
    rows.push({ app, screen: key, file: s.file, line: s.line, calls, elements });
  }
  return rows;
}

const provider = build('provider-app', provScreens, provElements, (s) => s.route);
const admin = build('admin', admScreens, admElements, (s) => s.route);

const count = (rows) => {
  const c = { screens: rows.length, elements: 0, calls: 0, OK: 0, FIXED: 0, 'MISSING-BACKEND': 0, FLAGGED: 0 };
  for (const r of rows) { c.calls += r.calls.length; for (const e of r.elements) { c.elements += 1; c[e.status] += 1; } }
  return c;
};
const summary = { 'provider-app': count(provider), admin: count(admin) };
const report = { note: 'Generated by tools/qa/screens-report.mjs from docs/design/inventory/*. Do not edit by hand.', summary, screens: [...provider, ...admin] };
const json = JSON.stringify(report, null, 1) + '\n';

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const L = [];
L.push('# Provider app and admin dashboard: every screen, every element, what it is wired to', '');
L.push('Generated by `node tools/qa/screens-report.mjs` from the static inventories (`docs/design/inventory/*`, written by `tools/design/screen-inventory.mjs`). Do not edit by hand.', '');
L.push('**Status:** OK = wired to a real backend endpoint (route and method checked against the controllers), local logic, navigation or a parent callback, nothing suspicious · FIXED = was flagged and fixed (`docs/qa/provider-screens-fixed.json`) · MISSING-BACKEND = calls an endpoint the backend does not have · FLAGGED = dead handler, mock data or placeholder, not yet resolved.', '');
L.push('**Limits (stated, not hidden):** static and heuristic analysis. A prop-fed list or a handler passed down from a parent is traced only inside its own component. Response field names and per-field validation (required, format, min/max, the error text) are not compared by this report; `tools/audit/dtocheck.js` checks that every field a client sends exists in the backend DTO. A control can be wired to a real endpoint and still behave wrongly: that needs the live runs in `docs/qa/provider-journeys.md`.', '');
L.push('## Counts', '', '| App | Screens | Elements | Endpoint calls | OK | FIXED | MISSING-BACKEND | FLAGGED |', '|---|---|---|---|---|---|---|---|');
for (const [app, c] of Object.entries(summary)) L.push(`| ${app} | ${c.screens} | ${c.elements} | ${c.calls} | ${c.OK} | ${c.FIXED} | ${c['MISSING-BACKEND']} | ${c.FLAGGED} |`);
L.push('');
const fixedRows = Object.entries(fixed);
if (fixedRows.length) {
  L.push('## Fixed by this audit (found by the independent scans, not by the inventory heuristics)', '', '| element | change | PR |', '|---|---|---|');
  for (const [k, v] of fixedRows) L.push(`| \`${k}\` | ${v.what} | ${v.pr} |`);
  L.push('');
}
for (const [title, rows] of [['Provider app', provider], ['Admin dashboard', admin]]) {
  L.push(`## ${title}`, '');
  for (const r of rows) {
    const bad = r.elements.filter((e) => e.status !== 'OK').length;
    L.push(`### ${r.screen}`, '', `\`${r.file}:${r.line}\` · ${r.elements.length} elements · ${r.calls.length} calls${bad ? ` · **${bad} not OK**` : ''}`, '');
    if (!r.elements.length) { L.push('_No interactive element found by the inventory._', ''); continue; }
    L.push('| element | wired to | status |', '|---|---|---|');
    for (const e of r.elements) L.push(`| ${esc(e.element)} | ${esc(e.wired_to.slice(0, 140))} (\`${e.file.split('/').slice(-1)[0]}:${e.line}\`) | ${e.status}${e.note ? ` — ${esc(e.note.slice(0, 120))}` : ''} |`);
    L.push('');
  }
}
const md = L.join('\n') + '\n';

if (CHECK) {
  const stale = !existsSync(OUT_JSON) || readFileSync(OUT_JSON, 'utf8') !== json || !existsSync(OUT_MD) || readFileSync(OUT_MD, 'utf8') !== md;
  const open = Object.values(summary).reduce((a, c) => a + c.FLAGGED + c['MISSING-BACKEND'], 0);
  if (stale) console.error('screens-report: docs/qa/provider-screens.{json,md} are stale: run node tools/qa/screens-report.mjs');
  if (open) console.error(`screens-report: ${open} element(s) are FLAGGED or MISSING-BACKEND`);
  if (stale || open) process.exit(1);
  console.log('screens-report: up to date, nothing flagged.');
} else {
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, json); writeFileSync(OUT_MD, md);
  console.log(JSON.stringify(summary));
}
