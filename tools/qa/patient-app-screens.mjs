#!/usr/bin/env node
/**
 * docs/qa/patient-app-screens.md: one document that answers, for every patient-app screen, "what does each element call, does that
 * endpoint exist, and is anything mocked". It merges (no new analysis engine):
 *   docs/design/inventory/screens.json   routes and their API calls, each checked against the backend controllers (screen-inventory.mjs)
 *   docs/design/audit/*.json             the per-element audit tables (element | source | status) written while screens were rebuilt
 *   docs/design/needs-review/*.json      open problems, tagged [client] / [backend] / [owner]
 *   a supplementary scan of patient-app/app and patient-app/src for dead handlers, TODO text, Math.random, timers that fake success
 * Run `node tools/design/screen-inventory.mjs` first (it refreshes screens.json); `--check` fails when the committed file is stale.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'docs/qa/patient-app-screens.md');
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const GROUPS = [
  ['Auth and onboarding', (s) => ['login', 'register', 'otp', 'forgot-password', 'reset-password', 'welcome', 'intro', 'language', 'provider-info', 'terms', 'privacy'].includes(s)],
  ['Home, content and offers', (s) => ['(home)', 'services', 'offers', 'articles', 'programs'].includes(s)],
  ['Search and discovery', (s) => ['search', 'map', 'voice', 'doctor', 'facility', 'medicine', 'p', 's', 'shared', 'reviews', 'drug-scanner'].includes(s)],
  ['Chat and calls', (s, r) => s === 'room' || s === 'ai' || s === 'ai-assistant' || /\/(chat-with-doctor|video-call|incoming-call|call-history|post-call-rating|virtual-waiting-room|waiting-room)$/.test(r)],
  ['Consultations and booking', (s) => s === 'consultations'],
  ['Pharmacy', (s) => ['pharmacy', 'delivery'].includes(s)],
  ['Labs and radiology', (s) => s === 'diagnostics'],
  ['Nursing', (s) => s === 'nursing'],
  ['Insurance', (s, r) => s === 'insurance' || r === '/profile/insurance'],
  ['Family', (s) => s === 'family'],
  ['Prescriptions and medical orders', (s, r) => s === 'medical-orders' || /prescription/.test(r)],
  ['Payments, wallet and points', (s) => ['payments', 'loyalty'].includes(s)],
  ['Orders, tracking and returns', (s) => ['orders', 'returns'].includes(s)],
  ['Notifications', (s) => s === 'notifications'],
  ['Settings and profile', (s) => ['settings', 'profile'].includes(s)],
  ['Support and emergency', (s) => ['support', 'emergency'].includes(s)],
  ['Records, results and health programmes', (s) => ['health', 'reports', 'nutrition', 'maternity', 'mental-health', 'wearables'].includes(s)],
];
const groupOf = (route) => {
  const seg = route === '/' ? '(home)' : route.split('/')[1];
  for (const [name, test] of GROUPS) if (test(seg, route)) return name;
  return 'Other';
};

const inv = json('docs/design/inventory/screens.json');
const routes = inv.routes.filter((r) => r.app === 'patient-app');

// element audits by route (the last audit slice wins when a route was audited twice)
const audit = new Map();
for (const f of readdirSync(join(ROOT, 'docs/design/audit')).filter((n) => n.endsWith('.json')).sort()) {
  const j = json(`docs/design/audit/${f}`);
  if (Array.isArray(j) || j.app !== 'patient-app') continue;
  for (const s of j.screens) audit.set(s.route, { slice: j.slice, elements: s.elements });
}

// verified resolutions of audit rows that were stale or wrong when this document was generated (route + start of the element text)
const resolutions = existsSync(join(ROOT, 'docs/qa/patient-app-screens.resolutions.json')) ? json('docs/qa/patient-app-screens.resolutions.json') : [];
for (const r of resolutions) {
  const a = audit.get(r.route); const e = a && a.elements.find((x) => x[0].startsWith(r.element));
  if (!e) { console.error(`resolution matches no audit row: ${r.route} ${r.element}`); process.exit(1); }
  e[1] = `${e[1]} [${r.note}]`; e[2] = r.status;
}

// needs-review lines of the patient app
const nr = [];
for (const f of readdirSync(join(ROOT, 'docs/design/needs-review')).filter((n) => n.endsWith('.json'))) {
  const j = json(`docs/design/needs-review/${f}`);
  if (Array.isArray(j)) for (const it of j) if (it.app === 'patient-app') nr.push(it);
}
const tagOf = (it) => (/\[client\]/.test(it.found) ? 'client' : /\[backend\]/.test(it.found) ? 'backend' : /\[owner\]/.test(it.found) ? 'owner' : 'other');
const isOpen = (it) => { const s = it.review_status || 'open'; return !/^(fixed|not-a-problem|owner-decision)/.test(s); };

// supplementary scan
const SCAN = [
  ['No-op handler', /on(Press|PressIn|Change|ChangeText|Submit|ValueChange)=\{\s*(\(\s*\w*\s*\)\s*=>\s*(\{\s*\}|undefined|null)|undefined|noop|\(\)\s*=>\s*void 0)\s*\}/],
  ['TODO / FIXME / coming soon text', /\b(TODO|FIXME|XXX)\b|(coming soon|not implemented|lorem ipsum)/],
  ['Math.random used for a value (not an id or a retry jitter)', /Math\.random\(/],
  ['Simulated success (timer then success)', /setTimeout\([^)]*(setSuccess|setDone|success|onSuccess|router\.replace)/i],
];
const scanHits = [];
const walk = (dir) => {
  for (const n of readdirSync(dir)) {
    if (/node_modules|__tests__|\.test\.|__mocks__|^locales$|^dist$/.test(n)) continue;
    const p = join(dir, n); const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(n)) {
      const lines = readFileSync(p, 'utf8').split('\n');
      lines.forEach((l, i) => { if (/^\s*(\/\/|\*|\/\*)/.test(l) && !/TODO|FIXME/.test(l)) return; for (const [k, re] of SCAN) if (re.test(l) && !(k.startsWith('Math.random') && /toString\(36\)|randomUUID|jitter|backoff/.test(l)) && !/\{\/\*/.test(l)) scanHits.push({ kind: k, file: p.replace(ROOT + '/', ''), line: i + 1, text: l.trim().slice(0, 110) }); });
    }
  }
};
for (const d of ['patient-app/app', 'patient-app/src']) if (existsSync(join(ROOT, d))) walk(join(ROOT, d));

// the AST mock scan of the design tooling (WIRING_REPORT section 6), patient-app part
const mockScan = [];
{
  const w = readFileSync(join(ROOT, 'docs/design/WIRING_REPORT.md'), 'utf8');
  const a = w.indexOf('### patient-app ('); const b = w.indexOf('\n### ', a + 5);
  if (a >= 0) { let kind = ''; for (const l of w.slice(a, b < 0 ? undefined : b).split('\n')) { const h = l.match(/^#### (.+?): \d+/); if (h) kind = h[1]; const m = l.match(/^- `(.+?):(\d+)` (.*)$/); if (m) mockScan.push({ kind, file: m[1], line: m[2], text: m[3] }); } }
}

// group everything
const by = new Map(GROUPS.map(([n]) => [n, []]).concat([['Other', []]]));
for (const r of routes) by.get(groupOf(r.route)).push(r);
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const stat = { routes: routes.length, audited: 0, el: { ok: 0, fixed: 0, hidden: 0, gap: 0 }, calls: 0, callOk: 0, callOther: 0 };
for (const r of routes) {
  const a = audit.get(r.route); if (a) { stat.audited++; for (const e of a.elements) stat.el[e[2]] = (stat.el[e[2]] || 0) + 1; }
  for (const c of r.calls) { stat.calls++; c.status === 'OK' ? stat.callOk++ : stat.callOther++; }
}
const openNr = nr.filter(isOpen);
const cnt = (arr, t) => arr.filter((i) => tagOf(i) === t).length;

const L = [];
L.push('# Patient app: every screen, every element, what it is wired to', '');
L.push('_Generated by `tools/qa/patient-app-screens.mjs` from the screen inventory, the element audits, the needs-review files and a source scan. Edit the inputs, not this file._', '');
L.push('## Counts', '');
L.push('| | |', '|---|---|');
L.push(`| Screens (expo-router routes) | ${stat.routes} |`);
L.push(`| Screens with a per-element audit | ${stat.audited} (${stat.routes - stat.audited} have a call-level listing only, marked below) |`);
L.push(`| Elements audited | ${Object.values(stat.el).reduce((a, b) => a + b, 0)}: ok ${stat.el.ok}, fixed ${stat.el.fixed}, hidden (not drawn because no real data) ${stat.el.hidden}, gap ${stat.el.gap} |`);
L.push(`| API calls found in screens | ${stat.calls}: endpoint exists with that method ${stat.callOk}, other ${stat.callOther} |`);
L.push(`| Open needs-review items (patient app) | ${openNr.length}: [client] ${cnt(openNr, 'client')}, [backend] ${cnt(openNr, 'backend')}, [owner] ${cnt(openNr, 'owner')}, other ${cnt(openNr, 'other')} |`);
L.push(`| Source scan hits (dead handlers, TODO text, Math.random, fake-success timers) | ${scanHits.length} |`);
L.push(`| Mock scan (design tooling, WIRING_REPORT section 6) | ${mockScan.length} |`, '');
L.push('## How to read it', '');
L.push('- **Wired to** is `METHOD /path` and the controller `file:line` that handles it, found by the TypeScript-AST inventory (`tools/design/screen-inventory.mjs`), which also follows helpers and services a screen imports.');
L.push('- **Status** of an audited element: `ok` it calls the real endpoint or reads real local state; `fixed` it was wrong and was corrected; `hidden` it is not drawn because the backend sends no real data for it (nothing is invented); `gap` a known hole, listed under the group.');
L.push('- Limits, stated plainly: the inventory proves an endpoint exists with that method, not that the request body satisfies its DTO. The body check is `tools/audit/clientbodies.js` + `dtocheck.js` (692 DTO routes, 372 matched by patient and provider client calls, 0 mismatches; bodies built from variables are listed as "verify by hand"). Screens without an element audit show their calls but not each button.', '');

const callRows = (r) => r.calls.map((c) => `| ${esc(`${c.method} ${c.path}${c.query ? '?' + c.query : ''}`)} | ${esc(c.file)}:${c.line} | ${c.status}${c.backend ? ' → ' + esc(c.backend) : ''} |`);
for (const [name, list] of by) {
  if (!list.length) continue;
  const rs = new Set(list.map((r) => r.route));
  const gNr = openNr.filter((i) => rs.has(i.screen));
  const aud = list.filter((r) => audit.has(r.route));
  L.push(`## ${name}`, '');
  L.push(`${list.length} screens, ${aud.length} with element audit; open needs-review: [client] ${cnt(gNr, 'client')}, [backend] ${cnt(gNr, 'backend')}, [owner] ${cnt(gNr, 'owner')}.`, '');
  for (const r of list) {
    const a = audit.get(r.route);
    L.push(`### \`${r.route}\` · ${r.file}${r.status ? ' · ' + esc(r.status) : ''}`, '');
    if (a) {
      L.push('| Element | Wired to | Status |', '|---|---|---|');
      for (const e of a.elements) L.push(`| ${esc(e[0])} | ${esc(e[1])} | ${e[2]} |`);
    } else {
      L.push('_No per-element audit for this screen: its calls only._', '');
      if (r.calls.length) L.push('| Call | In | Status |', '|---|---|---|', ...callRows(r)); else L.push('No API call found (static, local state or navigation only).');
    }
    const mine = nr.filter((i) => i.screen === r.route && isOpen(i));
    for (const i of mine) L.push('', `- **Open ${tagOf(i)}** ${i.file ? `\`${i.file}:${i.line}\` ` : ''}${esc(i.element)}: ${esc(i.found.replace(/^\[\w+\]\s*/, '')).slice(0, 300)}`);
    L.push('');
  }
}
L.push('## Source scan (supplementary to the inventory)', '');
if (!scanHits.length) L.push('None found.');
else { L.push('| Kind | File:line | Text |', '|---|---|---|'); for (const h of scanHits) L.push(`| ${h.kind} | ${h.file}:${h.line} | \`${esc(h.text)}\` |`); }
L.push('', '## Mock scan of the design tooling (patient app)', '');
if (!mockScan.length) L.push('None found.'); else { L.push('| Kind | File:line | Text |', '|---|---|---|'); for (const h of mockScan) L.push(`| ${h.kind} | ${h.file}:${h.line} | ${esc(h.text)} |`); }
L.push('', '## Backend gaps (open [backend] items, one line each)', '');
for (const i of openNr.filter((x) => tagOf(x) === 'backend')) L.push(`- \`${i.screen}\` ${esc(i.element)}: ${esc(i.found.replace(/^\[backend\]\s*/, '')).slice(0, 220)}`);
L.push('');

const text = L.join('\n');
if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== text) { console.error('stale: docs/qa/patient-app-screens.md — run node tools/qa/patient-app-screens.mjs'); process.exit(1); }
} else { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, text); }
console.log(`patient-app-screens: ${stat.routes} screens, ${stat.audited} audited (${Object.values(stat.el).reduce((a, b) => a + b, 0)} elements), ${stat.calls} calls, ${openNr.length} open needs-review, ${scanHits.length} scan hits`);
