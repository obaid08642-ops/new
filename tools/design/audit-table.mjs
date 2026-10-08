#!/usr/bin/env node
/**
 * Generates the per-slice element audit and the Needs-review file from ONE compact JSON (owner, 2026-10-06:
 * short tables made by a tool, notes only for problems, one line each).
 *
 *   docs/design/audit/<slice>.json   (you write this)
 *   docs/design/audit/<slice>.md     (generated: a table per route)
 *   docs/design/needs-review/<slice>.json   (generated, the format screen-inventory.mjs reads)
 *
 * Input shape:
 * {
 *   "slice": "1d-app", "batch": 1, "app": "patient-app",
 *   "screens": [
 *     { "route": "/pharmacy/checkout",
 *       "elements": [ ["Place order button", "POST /pharmacy/orders", "ok"],
 *                     ["Total", "order.pricing.total (server)", "ok"],
 *                     ["Points row", "no endpoint", "hidden"] ],
 *       "notes": ["one line, only for a problem"] } ],
 *   "needsReview": [ { "route": "/x", "element": "Y", "kind": "backend|client|owner", "note": "one line",
 *                      "file": "patient-app/app/x.tsx", "line": 42, "backend": "backend/src/x.controller.ts:10 (optional)" } ]
 * }
 * Needs-review lines (owner, 2026-10-06; every batch from 2 on): "file" and "line" are REQUIRED = the exact file:line of the
 * element in the client (the JSX/handler/call that draws or does the thing), so the reviewer goes straight to it; the tool
 * checks that the file exists and the line is inside it. "backend" is optional (the controller/service line, when known).
 * The [client]/[backend]/[owner] tag (kind) stays on every line.
 * element = [element, source (API field / user input / static key), status]; status: ok | fixed | hidden | gap | todo.
 *   ok = drawn from the source; fixed = an old defect fixed here; hidden = not drawn because no data/action exists;
 *   gap = drawn but the backend is wrong (also add a needsReview line); todo = unfinished (fails --check).
 *
 *   node tools/design/audit-table.mjs docs/design/audit/1d-app.json          write the .md and the needs-review file
 *   node tools/design/audit-table.mjs docs/design/audit/1d-app.json --check  fail on todo, unknown route/status, stale output,
 *                                                                           and warn for inventory backend calls no element mentions
 *
 * Provider app (read-only wiring audit, docs/design/audit/provider-<area>.json, "app": "provider-app"):
 *   node tools/design/audit-table.mjs docs/design/audit/provider-doctor.json --provider [--check]
 *   --provider reads docs/design/inventory/provider-screens.json (route = screen name) instead of screens.json, accepts the extra
 *   statuses  not wired | dead | mock | placeholder | broken  (ok = wired and working; the others are problems; each problem has a
 *   needsReview line with file:line), and requires file + line on every needsReview line. `todo` still fails --check.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = process.argv[2];
const CHECK = process.argv.includes('--check');
if (!file) { console.error('usage: node tools/design/audit-table.mjs docs/design/audit/<slice>.json [--check] [--provider]'); process.exit(2); }

const src = resolve(REPO, file);
const a = JSON.parse(readFileSync(src, 'utf8'));
const PROVIDER = process.argv.includes('--provider');
const STATUS = new Set(['ok', 'fixed', 'hidden', 'gap', 'todo', ...(PROVIDER ? ['not wired', 'dead', 'mock', 'placeholder', 'broken'] : [])]);
const KIND = new Set(['backend', 'client', 'owner']);
const problems = [];
const warnings = [];

const inv = JSON.parse(readFileSync(join(REPO, PROVIDER ? 'docs/design/inventory/provider-screens.json' : 'docs/design/inventory/screens.json'), 'utf8')).routes;
const routeOf = new Map(inv.filter((r) => r.app === a.app).map((r) => [r.route, r]));

for (const s of a.screens ?? []) {
  const r = routeOf.get(s.route);
  if (!r) { problems.push(`unknown route for ${a.app}: ${s.route}`); continue; }
  const text = (s.elements ?? []).map((e) => String(e[1])).join('\n');
  for (const [i, e] of (s.elements ?? []).entries()) {
    if (!Array.isArray(e) || e.length !== 3) problems.push(`${s.route} element ${i}: expected [element, source, status]`);
    else if (!STATUS.has(e[2])) problems.push(`${s.route} "${e[0]}": unknown status "${e[2]}"`);
    else if (e[2] === 'todo') problems.push(`${s.route} "${e[0]}": todo`);
  }
  for (const c of (r.calls ?? []).filter((c) => c.target === 'backend')) {
    const tail = String(c.path).split('?')[0];
    if (!text.includes(tail)) warnings.push(`${s.route}: backend call ${c.method} ${c.path} is in the inventory but no element names it`);
  }
}
const WHERE_REQUIRED = Number(a.batch) >= 2 || PROVIDER;
const lineCount = new Map();
const linesOf = (f) => {
  if (!lineCount.has(f)) lineCount.set(f, existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), 'utf8').split('\n').length : -1);
  return lineCount.get(f);
};
for (const n of a.needsReview ?? []) {
  if (!KIND.has(n.kind)) problems.push(`needsReview "${n.element}": kind must be backend|client|owner`);
  if (!routeOf.has(n.route)) problems.push(`needsReview: unknown route ${n.route}`);
  if (WHERE_REQUIRED || n.file || n.line) {
    if (typeof n.file !== 'string' || !n.file) problems.push(`needsReview "${n.element}" (${n.route}): "file" is required (exact file of the element)`);
    else if (linesOf(n.file) < 0) problems.push(`needsReview "${n.element}": file ${n.file} does not exist`);
    if (!Number.isInteger(n.line) || n.line < 1) problems.push(`needsReview "${n.element}" (${n.route}): "line" is required (exact line of the element, a positive integer)`);
    else if (typeof n.file === 'string' && linesOf(n.file) > 0 && n.line > linesOf(n.file)) problems.push(`needsReview "${n.element}": line ${n.line} is past the end of ${n.file} (${linesOf(n.file)} lines)`);
  }
}

const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const L = [];
L.push(`# Element audit ${a.slice} (${a.app}, batch ${a.batch})`, '', '_Generated by `tools/design/audit-table.mjs` from `' + file + '`. Edit the JSON, not this file._', '');
const count = { ok: 0, fixed: 0, hidden: 0, gap: 0, ...(PROVIDER ? { 'not wired': 0, dead: 0, mock: 0, placeholder: 0, broken: 0 } : {}) };
for (const s of a.screens ?? []) {
  const r = routeOf.get(s.route);
  L.push(`## \`${s.route}\`${r?.board && r.board !== '—' ? ` (board ${r.board})` : ''}`, '', '| Element | Source | Status |', '|---|---|---|');
  for (const e of s.elements ?? []) { L.push(`| ${esc(e[0])} | ${esc(e[1])} | ${e[2]} |`); if (e[2] in count) count[e[2]]++; }
  for (const n of s.notes ?? []) L.push('', `- ${esc(n)}`);
  L.push('');
}
if ((a.needsReview ?? []).length) {
  L.push('## Needs review', '', '| Route | Element | Kind | Where | Note |', '|---|---|---|---|---|');
  for (const n of a.needsReview) L.push(`| \`${n.route}\` | ${esc(n.element)} | ${n.kind} | ${n.file ? `\`${n.file}:${n.line}\`` : ''}${n.backend ? ` (backend \`${esc(n.backend)}\`)` : ''} | ${esc(n.note)} |`);
  L.push('');
}
L.push(PROVIDER
  ? `_${(a.screens ?? []).length} screen(s): ${count.ok} ok, ${count['not wired']} not wired, ${count.dead} dead, ${count.mock} mock, ${count.placeholder} placeholder, ${count.broken} broken; ${(a.needsReview ?? []).length} Needs-review line(s)._`
  : `_${(a.screens ?? []).length} screen(s): ${count.ok} ok, ${count.fixed} fixed, ${count.hidden} hidden, ${count.gap} gap; ${(a.needsReview ?? []).length} Needs-review line(s)._`, '');
const md = L.join('\n');

const needs = (a.needsReview ?? []).map((n) => ({
  batch: a.batch, app: a.app, screen: n.route, element: n.element,
  file: n.file ?? '', line: n.line ?? 0, found: `[${n.kind}] ${n.note}${n.backend ? ` (backend: ${n.backend})` : ''}`, suspect: n.kind === 'backend' ? 'Backend gap: reviewer session.' : n.kind === 'owner' ? 'Owner decision.' : 'Client-side: later batch.',
}));
const needsJson = JSON.stringify(needs, null, 2) + '\n';

const mdPath = src.replace(/\.json$/, '.md');
const nrPath = join(REPO, 'docs/design/needs-review', `${basename(src, '.json')}.json`);

if (CHECK) {
  if (existsSync(mdPath) && readFileSync(mdPath, 'utf8') !== md) problems.push(`${mdPath} is stale: re-run without --check`);
  if (existsSync(nrPath) && readFileSync(nrPath, 'utf8') !== needsJson) problems.push(`${nrPath} is stale: re-run without --check`);
} else if (!problems.length) {
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, md);
  writeFileSync(nrPath, needsJson);
}
for (const w of warnings) console.warn(`warn: ${w}`);
if (problems.length) { for (const p of problems) console.error(`audit-table: ${p}`); process.exit(1); }
console.log(`audit-table: ${a.slice}: ${(a.screens ?? []).length} screen(s), ${needs.length} Needs-review line(s)${CHECK ? ' (check ok)' : ' written'}${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);
