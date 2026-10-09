#!/usr/bin/env node
/**
 * Admin element audit, step 2 of 2 (step 1 is `node tools/design/admin-inventory.mjs`, which writes
 * docs/design/inventory/admin-screens.json and admin-elements.json).
 *
 *   node tools/design/admin-audit-generate.mjs          writes docs/design/audit/admin-<area>.json (one per area)
 *   node tools/design/audit-table.mjs docs/design/audit/admin-<area>.json --admin   then writes the .md and
 *                                                       docs/design/needs-review/admin-<area>.json
 *   node tools/design/admin-audit-generate.mjs --check  fails when an audit JSON is stale against the inventory
 *
 * Element rows come from the static analysis (not hand-written). Reviewed false positives live in
 * docs/design/inventory/admin-audit-overrides.json ({route, file, line, status, reason}); hand-verified extra findings in
 * docs/design/inventory/admin-audit-manual.json ({route, element, kind, note, file, line, status?, backend?}).
 * Every non-ok row, every broken call, every guard finding becomes one Needs-review line with file:line.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = process.argv.includes('--check');
const J = (p, d) => (existsSync(join(REPO, p)) ? JSON.parse(readFileSync(join(REPO, p), 'utf8')) : d);
const inv = J('docs/design/inventory/admin-screens.json');
const rows = inv.routes;
const els = J('docs/design/inventory/admin-elements.json').screens;
const overrides = J('docs/design/inventory/admin-audit-overrides.json', []);
const manual = J('docs/design/inventory/admin-audit-manual.json', []);
const AREAS = ['ops-monitoring', 'providers', 'finance', 'catalogue', 'customers-growth', 'system', 'public-directories'];
const GUARD_FILE = 'admin/src/components/AdminGuard.tsx';
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
// owner decisions (docs/product/OWNER_DECISIONS_2026-10-06.md): O-2 ambulance system removed; item 1 community posts removed
const OWNER = {
  '/admin/ambulance-fleet': 'Owner decision O-2 (2026-10-06, item 14) removes the whole ambulance system including the admin fleet; this page goes with it.',
  '/admin/sos-monitor': 'Owner decision 14 / O-2 (2026-10-06): no ambulance dispatch, assign, claim or tracking from our side (the 997 dial button stays); the assign / escalate-997 actions of this page go with the removal.',
  '/admin/community-moderation': 'Owner decision item 1 (2026-10-06) removes community user posts completely; this moderation page goes with them.',
};

const stale = [];
const summary = {};
for (const area of AREAS) {
  const screens = [];
  const needs = [];
  for (const r of rows.filter((x) => x.area === area)) {
    const list = els[r.route] ?? [];
    const ov = (e) => overrides.find((o) => o.route === r.route && o.file === e.file && o.line === e.line);
    const elements = [];
    const name = (e) => `${e.kind === 'text' ? '' : e.kind + ': '}${clip(e.label, 60)}${e.via ? ` (in ${e.via})` : ''}`;
    for (const e0 of list) {
      const o = ov(e0);
      const e = o ? { ...e0, status: o.status, note: o.status === 'ok' ? undefined : e0.note } : e0;
      elements.push([name(e), clip(e.src, 120), e.status]);
      if (e.status !== 'ok' && e.note) needs.push({ route: r.route, element: clip(e.label, 60), kind: 'client', note: clip(e.note, 220), file: e.file, line: e.line });
      else if (e.warn && !o) needs.push({ route: r.route, element: clip(e.label, 60), kind: 'client', note: clip(e.warn, 220), file: e.file, line: e.line });
    }
    const text = elements.map((e) => e[1]).join('\n');
    for (const c of r.calls.filter((c) => !text.includes(c.path.split('?')[0]))) elements.push([`API: ${c.method} ${c.path}`, `${c.method} ${c.path} (${c.status}${c.backend ? `, ${c.backend}` : ''})`, ['OK', 'BFF'].includes(c.status) ? 'ok' : 'broken']);
    for (const c of r.calls.filter((c) => !['OK', 'BFF'].includes(c.status))) {
      const bad = c.status === 'BAD_URL';
      needs.push({ route: r.route, element: `API ${c.method} ${c.path}`, kind: bad ? 'client' : c.status === 'WRONG_METHOD' || c.status === 'NO_ROUTE' ? 'backend' : 'client', note: bad ? c.note : `Endpoint is ${c.status}${c.note ? ` (${c.note})` : ''}: the call fails or hits nothing.`, file: c.file, line: c.line, backend: c.backend });
    }
    // guard findings: one line per page and code, except high severity (one each)
    const groups = new Map();
    for (const g of r.guardFindings) {
      if (g.clientOnly) {
        needs.push({ route: r.route, element: `Permission ${g.code}`, kind: 'client', note: g.note, file: GUARD_FILE, line: r.navLine || 1 });
        continue;
      }
      if (g.severity === 'high') { needs.push({ route: r.route, element: `Guard ${g.code}: ${g.method} ${g.path}`, kind: 'backend', note: g.note, file: g.file, line: g.line, backend: g.backend }); continue; }
      const k = g.code;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(g);
    }
    for (const [code, list2] of groups) {
      const first = list2[0];
      const paths = [...new Set(list2.map((g) => `${g.method} ${g.path}`))];
      const lead = code === 'G-PAGE-NOPERM' ? `Page has no client permission (AdminGuard ROUTE_PERMISSIONS) but ${paths.length} call(s) need permissions the backend checks (${paths.slice(0, 3).join('; ')}${paths.length > 3 ? '; …' : ''}); any admin sees the page and gets 403s inside it.`
        : code === 'G-OPEN' ? `${paths.length} call(s) hit backend routes with no role/permission guard (${paths.slice(0, 3).join('; ')}${paths.length > 3 ? '; …' : ''}): any signed-in user passes JwtAuthGuard.`
        : code === 'G-ROLE-ONLY-WRITE' ? `${paths.length} sensitive write(s) are role-only on the backend, no @RequirePermissions (${paths.slice(0, 3).join('; ')}${paths.length > 3 ? '; …' : ''}): every admin role, including a custom restricted one, can run them.`
        : `${paths.length} call(s): ${clip(list2.map((g) => g.note).join(' | '), 160)}`;
      needs.push({ route: r.route, element: `Guard ${code} (${paths.length})`, kind: code === 'G-PAGE-NOPERM' ? 'client' : 'backend', note: lead, file: first.file, line: first.line, backend: first.backend });
    }
    if (OWNER[r.route]) needs.push({ route: r.route, element: 'Removed feature', kind: 'owner', note: OWNER[r.route], file: r.file, line: 1 });
    if (r.orphan) needs.push({ route: r.route, element: 'No nav link', kind: 'client', note: 'Page exists but has no entry in NAV_SECTIONS: reachable only by URL or from another page.', file: r.file, line: 1 });
    if (r.publicDirectory) needs.push({ route: r.route, element: 'Public page inside admin', kind: 'owner', note: 'Public site page hosted in the admin app (no admin guard: proxy.ts only forces login under /admin). Owner/reviewer decide whether public pages belong in patient-web instead.', file: r.file, line: 1 });
    for (const m of manual.filter((x) => x.route === r.route)) {
      elements.push([m.element, clip(m.src || 'hand-verified', 120), m.status || 'broken']);
      needs.push({ route: r.route, element: m.element, kind: m.kind, note: m.note, file: m.file, line: m.line, ...(m.backend ? { backend: m.backend } : {}) });
    }
    const notes = [];
    if (!r.calls.length) notes.push('No API call in the page or its local components (static, or all data comes from props).');
    if (!list.length && !elements.length) notes.push('No tracked elements.');
    const untraced = list.filter((e) => e.untraced).length;
    if (untraced) notes.push(`${untraced} handler(s) are passed as props (parent callbacks) and are not traced.`);
    screens.push({ route: r.route, elements, ...(notes.length ? { notes } : {}) });
  }
  const seen = new Set();
  const dedup = needs.filter((n) => { const k = `${n.route}|${n.file}|${n.line}|${n.element}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const cnt = { ok: 0, 'not wired': 0, dead: 0, mock: 0, placeholder: 0, broken: 0 };
  for (const sc of screens) for (const e of sc.elements) cnt[e[2]]++;
  const areaRows = rows.filter((x) => x.area === area);
  summary[area] = { screens: areaRows.length, calls: areaRows.reduce((t, x) => t + x.calls.length, 0), cnt, needs: dedup };
  const out = { slice: `admin-${area}`, batch: 'admin', app: 'admin', screens, needsReview: dedup };
  const path = join(REPO, `docs/design/audit/admin-${area}.json`);
  const json = JSON.stringify(out, null, 1) + '\n';
  if (CHECK) { if (!existsSync(path) || readFileSync(path, 'utf8') !== json) stale.push(path); } else writeFileSync(path, json);
}
{
  const L = ['# Admin audit summary', '', '_Generated by `tools/design/admin-audit-generate.mjs`. Read-only audit: nothing was fixed._', ''];
  const all = AREAS.flatMap((a) => summary[a].needs.map((n) => ({ ...n, area: a })));
  L.push('| Area | Pages | Calls | Elements ok | not wired | dead | mock | placeholder | broken | Needs review (client / backend / owner) |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const a of AREAS) {
    const m = summary[a];
    const k = (x) => m.needs.filter((n) => n.kind === x).length;
    L.push(`| ${a} | ${m.screens} | ${m.calls} | ${m.cnt.ok} | ${m.cnt['not wired']} | ${m.cnt.dead} | ${m.cnt.mock} | ${m.cnt.placeholder} | ${m.cnt.broken} | ${k('client')} / ${k('backend')} / ${k('owner')} |`);
  }
  L.push('', `Needs-review lines: ${all.length}.`, '');
  const path = join(REPO, 'docs/design/ADMIN_AUDIT_SUMMARY.md');
  const md = L.join('\n');
  if (CHECK) { if (!existsSync(path) || readFileSync(path, 'utf8') !== md) stale.push(path); } else writeFileSync(path, md);
}
if (CHECK) {
  if (stale.length) { for (const p of stale) console.error(`stale: ${p}: run node tools/design/admin-audit-generate.mjs and audit-table.mjs --admin`); process.exit(1); }
  console.log('admin-audit-generate: check ok');
} else console.log(`admin-audit-generate: wrote ${AREAS.length} area files`);
