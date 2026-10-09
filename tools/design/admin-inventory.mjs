#!/usr/bin/env node
/**
 * Admin (Next.js pages router) wiring inventory. READ-ONLY audit: nothing is fixed, no UI is built.
 * Same pattern as provider-inventory.mjs, simplified because admin is a web app with one fetch layer.
 *
 *   node tools/design/admin-inventory.mjs            writes docs/design/ADMIN_INVENTORY.md, docs/design/ADMIN_WIRING_REPORT.md,
 *                                                    docs/design/inventory/admin-screens.json, docs/design/inventory/admin-elements.json
 *   node tools/design/admin-inventory.mjs --check    fails when those files are stale
 *
 * What it does (static, TypeScript AST; limits are listed in ADMIN_WIRING_REPORT.md):
 *  1. PAGES: every admin/src/pages/**.tsx except _app/_document/api. Unit = the page + the local components it imports (depth 2).
 *  2. CALLS: adminFetch / adminMutation (lib/admin-client), fetchWithAdminGuard / apiFetch (utils/api), raw fetch, window.open / href
 *     downloads. The path is normalised the way each helper really does it, then the Next BFF (pages/api/admin/[...path].ts maps
 *     /api/admin/<x> to /api/v1/<x>; a few specific BFF handlers exist), then matched against backend controllers
 *     (tools/audit/routes.py) -> OK / NO_ROUTE / WRONG_METHOD / BFF.
 *  3. GUARDS: for every matched backend route the effective @Public / @Roles / @RequirePermissions (handler overrides class, like
 *     JwtAuthGuard.getAllAndOverride) is read from the controller source and compared with the page's client permission
 *     (AdminGuard ROUTE_PERMISSIONS + NAV_SECTIONS) and with the Permission enum vocabulary.
 *  4. ELEMENTS: buttons / links / forms / inputs / callbacks, what each one does (request, navigation, confirm, state only,
 *     toast-or-alert only = fake success, dead, parent callback), hard-coded record arrays (mock leads), placeholder text,
 *     lists that nothing fills, inputs whose value is never used.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = process.argv.includes('--check');
const rel = (p) => relative(REPO, p).split(sep).join('/');
const read = (p) => readFileSync(p, 'utf8');
const SRC = join(REPO, 'admin/src');

function loadTs() {
  const req = createRequire(import.meta.url);
  const cands = [process.env.TS_PATH, ...['admin', 'backend', 'patient-web', 'patient-app'].map((b) => join(REPO, b, 'node_modules', 'typescript'))].filter(Boolean);
  for (const p of cands) if (existsSync(p)) return req(p);
  try { return req('typescript'); } catch { console.error('typescript not found: set TS_PATH or run npm ci in admin/'); process.exit(2); }
}
const ts = loadTs();

function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ backend routes + guards */
const PERM_ENUM = (() => {
  const src = read(join(REPO, 'backend/src/common/permissions.ts'));
  const byKey = new Map();
  for (const m of src.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*'([^']+)'/gm)) byKey.set(m[1], m[2]);
  return byKey;
})();
const PERM_VALUES = new Set(PERM_ENUM.values());
const fileCache = new Map();
const lines = (f) => { if (!fileCache.has(f)) fileCache.set(f, read(f).split('\n')); return fileCache.get(f); };

function decoGuards(text) {
  const g = {};
  if (/@Public\s*\(/.test(text)) g.public = true;
  const roles = text.match(/@Roles\s*\(([^)]*)\)/);
  if (roles) g.roles = [...roles[1].matchAll(/(?:UserRole\.)?([A-Za-z_]+)/g)].map((m) => m[1]).filter((x) => x !== 'UserRole');
  const perms = text.match(/@RequirePermissions\s*\(([^)]*)\)/);
  if (perms) g.perms = [...perms[1].matchAll(/Permission\.([A-Z0-9_]+)/g)].map((m) => PERM_ENUM.get(m[1]) ?? m[1]);
  const ug = [...text.matchAll(/@UseGuards\s*\(([^)]*)\)/g)].map((m) => m[1].trim());
  if (ug.length) g.useGuards = ug.join(', ');
  if (/@SkipAuth|@NoAuth|@AllowAnonymous/.test(text)) g.public = true;
  return g;
}

function backendRoutes() {
  const out = join(tmpdir(), `nabd-admin-routes-${process.pid}.json`);
  const r = spawnSync('python3', ['tools/audit/routes.py', out], { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) { console.error('tools/audit/routes.py failed', r.stderr); process.exit(2); }
  const raw = JSON.parse(read(out));
  return raw.map((x) => {
    const file = join(REPO, x.f);
    const L = lines(file);
    const i = x.l - 1;
    // handler decorators: upwards while decorator-ish, downwards to the method signature
    let a = i;
    while (a > 0 && /^\s*(@|\)|\w+\.\w+|[A-Za-z_.]+,?\s*$)/.test(L[a - 1]) && !/[;{}]\s*$/.test(L[a - 1])) a--;
    let b = i + 1;
    while (b < L.length && (/^\s*@/.test(L[b]) || !/^\s*(public\s+|async\s+|private\s+)*[A-Za-z_]\w*\s*[<(]/.test(L[b])) && b - i < 14) b++;
    const handler = decoGuards(L.slice(a, b).join('\n'));
    // class decorators: nearest @Controller above
    let c = i;
    while (c >= 0 && !/@Controller\s*\(/.test(L[c])) c--;
    let cls = {};
    if (c >= 0) {
      let u = c;
      while (u > 0 && /^\s*@/.test(L[u - 1])) u--;
      let d = c;
      while (d < i && !/\bclass\s+\w+/.test(L[d])) d++;
      cls = decoGuards(L.slice(u, d + 1).join('\n'));
    }
    const eff = {
      public: handler.public ?? cls.public ?? false,
      roles: handler.roles ?? cls.roles ?? [],
      perms: handler.perms ?? cls.perms ?? [],
      useGuards: [cls.useGuards, handler.useGuards].filter(Boolean).join(' | '),
    };
    return { m: x.m, p: x.p, segs: x.p.split('/').filter(Boolean), src: `${x.f}:${x.l}`, file: x.f, line: x.l, guards: eff };
  });
}

function matchRoute(routes, method, path) {
  const segs = path.split('/').filter(Boolean);
  const hits = routes.filter((r) => r.segs.length === segs.length && r.segs.every((b, i) => b.startsWith(':') || b === '*' || segs[i] === ':param' || segs[i] === b));
  if (!hits.length) return { status: 'NO_ROUTE' };
  const score = (r) => r.segs.reduce((s, b, i) => s + (b === segs[i] ? 2 : segs[i] === ':param' && !b.startsWith(':') ? 0 : 1), 0);
  hits.sort((a, b) => score(b) - score(a));
  const ok = hits.find((r) => r.m === method || r.m === 'ALL');
  if (ok) return { status: 'OK', route: ok };
  return { status: 'WRONG_METHOD', route: hits[0], methods: [...new Set(hits.map((h) => h.m))] };
}

/* ------------------------------------------------------------------ BFF handlers (pages/api/admin/**) */
const bffFiles = walk(join(SRC, 'pages/api/admin'), (p) => /\.ts$/.test(p)).map((f) => ({ f, segs: relative(join(SRC, 'pages/api'), f).replace(/\.ts$/, '').split(sep) }));
const catchAll = bffFiles.find((h) => h.segs.some((s) => /^\[\.\.\./.test(s)));
function matchBff(path) {
  const segs = path.split('/').filter(Boolean); // api, admin, ...
  for (const h of bffFiles.filter((x) => x !== catchAll)) {
    const hs = ['api', ...h.segs];
    if (hs.length !== segs.length) continue;
    if (hs.every((s, i) => /^\[.+\]$/.test(s) || s === segs[i] || segs[i] === ':param')) return h;
  }
  return null;
}

/* ------------------------------------------------------------------ client permission map */
const guardSrc = read(join(SRC, 'components/AdminGuard.tsx'));
const ROUTE_PERMS = {};
for (const m of guardSrc.matchAll(/'(\/admin\/[a-z-]+)':\s*'([^']+)'/g)) ROUTE_PERMS[m[1]] = m[2];
const NAV = [];
for (const m of guardSrc.matchAll(/\{\s*href:\s*'([^']+)',\s*label:\s*'([^']+)'(?:,\s*permission:\s*'([^']+)')?\s*\}/g)) NAV.push({ href: m[1], label: m[2], permission: m[3] });
const NAV_LINE = (href) => { const i = lines(join(SRC, 'components/AdminGuard.tsx')).findIndex((l) => l.includes(`href: '${href}'`)); return i + 1; };
function requiredPermissionFor(pathname) {
  if (ROUTE_PERMS[pathname]) return ROUTE_PERMS[pathname];
  let best;
  for (const p of Object.keys(ROUTE_PERMS)) if (pathname === p || pathname.startsWith(`${p}/`)) if (!best || p.length > best.length) best = p;
  return best ? ROUTE_PERMS[best] : undefined;
}

/* ------------------------------------------------------------------ pages */
const AREA_OF = {
  'ops-monitoring': ['command-center', 'dashboard', 'orders', 'order-detail', 'sos-monitor', 'fraud-monitoring', 'health-dashboard', 'broadcast-monitor', 'appointments-oversight', 'live-chat-console', 'search'],
  providers: ['provider-moderation', 'provider-audits', 'insurance-queue', 'insurance-companies', 'ambulance-fleet', 'pharmacy-procurement', 'nursing-portal'],
  finance: ['finance-suite', 'disputes', 'payouts', 'returns', 'financial-ledger', 'commissions'],
  catalogue: ['medicines-catalog', 'catalog-manager', 'catalog-governance', 'price-override-audit', 'shortage-reports', 'image-suggestions'],
  'customers-growth': ['crm', 'segments', 'gdpr', 'content-growth', 'home-curation', 'search-intelligence', 'community-moderation', 'loyalty-config', 'users-management', 'locations', 'support-tickets', 'impersonation', 'notification-center', 'analytics', 'analytics-suite', 'reports'],
  system: ['rbac', 'system-ops', 'scheduled-reports', 'audit-logs', 'security', 'config-portal', 'ai-control', 'theme-control', 'legal-policies', 'login'],
};
const PUBLIC_DIR = new Set(['', 'doctors', 'articles', 'lab-services', 'home-care-services', 'facilities', 'medicines', 's/[type]/[slug]']);
function routeOfFile(f) {
  let r = '/' + relative(join(SRC, 'pages'), f).replace(/\.tsx$/, '').split(sep).join('/');
  r = r.replace(/\/index$/, '') || '/';
  return r;
}
function areaOf(route) {
  const k = route.replace(/^\/admin\//, '').replace(/^\//, '');
  if (route.startsWith('/admin/')) {
    for (const [a, list] of Object.entries(AREA_OF)) if (list.some((x) => k === x || k.startsWith(x + '/'))) return a;
    return 'system';
  }
  if (route === '/login') return 'system';
  return 'public-directories';
}
const pageFiles = walk(join(SRC, 'pages'), (p) => /\.tsx$/.test(p) && !/pages\/(_app|_document)\.tsx$/.test(p) && !/pages\/api\//.test(p.split(sep).join('/')));

/* ------------------------------------------------------------------ AST helpers */
const parsed = new Map();
function parse(file) {
  if (!parsed.has(file)) parsed.set(file, ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  return parsed.get(file);
}
const lineOf = (n) => n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;
const unwrap = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))) e = e.expression; return e; };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const c of [base + '.tsx', base + '.ts', join(base, 'index.tsx'), join(base, 'index.ts')]) if (existsSync(c)) return c;
  return null;
}
function unitFiles(entry) {
  const seen = new Map([[entry, null]]);
  let frontier = [entry];
  for (let d = 0; d < 2; d++) {
    const next = [];
    for (const f of frontier) {
      for (const st of parse(f).statements) {
        if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
        const t = resolveImport(f, st.moduleSpecifier.text);
        if (!t || seen.has(t) || !/\/(components|pages)\//.test(rel(t))) continue;
        seen.set(t, rel(f) === rel(entry) ? rel(t).split('/').pop().replace(/\.tsx?$/, '') : seen.get(f));
        next.push(t);
      }
    }
    frontier = next;
  }
  return seen; // file -> via
}

// const initialisers by name for a source file (strings used as paths)
function constMap(sf) {
  const m = new Map();
  const pv = new Map();
  const f = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) m.set(n.name.text, n.initializer);
    if (ts.isPropertyAssignment(n) && ts.isStringLiteral(unwrap(n.initializer)) && unwrap(n.initializer).text.startsWith('/')) {
      const k = n.name.getText();
      if (!pv.has(k)) pv.set(k, []);
      pv.get(k).push(unwrap(n.initializer).text);
    }
    ts.forEachChild(n, f);
  };
  f(sf);
  m.propVals = pv;
  return m;
}
const MARK = '\u0001';
function expandMarks(raw) {
  // marker \u0001name\u0001 is replaced by every literal value of that property in the file (see pathOf)
  return [raw];
}
void expandMarks;
const QUERY_NAME = /^(q|qs|query|querystring|params|search|suffix|filters?|geoQuery|extra|queryString|qp)$/i;
function pathOf(node, cm, depth = 0) {
  node = unwrap(node);
  if (!node || depth > 4) return null;
  if (ts.isPropertyAccessExpression(node) && cm.propVals?.has(node.name.text)) return `${MARK}${node.name.text}${MARK}`;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    let s = node.head.text;
    node.templateSpans.forEach((sp, i) => {
      const e = unwrap(sp.expression);
      const last = i === node.templateSpans.length - 1;
      if (ts.isPropertyAccessExpression(e) && cm.propVals?.has(e.name.text)) { s += `${MARK}${e.name.text}${MARK}` + sp.literal.text; return; }
      const isQ = (ts.isCallExpression(e) && /toQuery|qs|query|search/i.test(e.expression.getText())) || (ts.isIdentifier(e) && QUERY_NAME.test(e.text)) || (ts.isConditionalExpression(e) && /^\s*['"`]?[?&]/.test(e.whenTrue.getText().replace(/^[`'"]/, '')));
      if (isQ && (last || /^[?&]/.test(sp.literal.text) || sp.literal.text === '')) s += '?'; // everything after is query
      else s += ':param';
      s += sp.literal.text;
    });
    return s;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = pathOf(node.left, cm, depth + 1);
    const r = pathOf(node.right, cm, depth + 1);
    if (l == null) return null;
    return l + (r ?? '?');
  }
  if (ts.isConditionalExpression(node)) return pathOf(node.whenTrue, cm, depth + 1);
  if (ts.isIdentifier(node) && cm.has(node.text)) return pathOf(cm.get(node.text), cm, depth + 1);
  if (ts.isCallExpression(node) && /encodeURIComponent/.test(node.expression.getText())) return ':param';
  return null;
}
function methodsOf(opts, cm) {
  if (!opts) return { methods: ['GET'] };
  const o = unwrap(opts);
  const resolved = ts.isIdentifier(o) && cm.has(o.text) ? unwrap(cm.get(o.text)) : o;
  if (!ts.isObjectLiteralExpression(resolved)) return { methods: ['GET'], note: 'request options are not a literal object (method assumed GET)' };
  const p = resolved.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText() === 'method');
  if (!p) return { methods: ['GET'], hasBody: resolved.properties.some((x) => x.name?.getText() === 'body') };
  const lits = [];
  const f = (n) => { if (ts.isStringLiteral(n)) lits.push(n.text.toUpperCase()); ts.forEachChild(n, f); };
  f(p.initializer);
  return { methods: lits.length ? [...new Set(lits)] : ['GET'], note: lits.length ? undefined : 'method is dynamic (assumed GET)', hasBody: true };
}

const HELPERS = { adminFetch: 'bffPath', adminMutation: 'bffPath', fetchWithAdminGuard: 'toBffUrl', apiFetch: 'toBffUrl', fetch: 'raw', fetchDirectory: 'directory' };
function toBffPath(helper, p) {
  if (helper === 'bffPath') return p.startsWith('/api/admin/') ? p : p.startsWith('/') ? `/api/admin${p}` : `/api/admin/${p}`;
  if (helper === 'directory') return `DIR:${p}`;
  if (helper === 'toBffUrl') {
    if (p.startsWith('/api/admin/')) return p;
    if (p.startsWith('/api/v1/admin/')) return `/api/admin/${p.slice('/api/v1/admin/'.length)}`;
    if (p.startsWith('/admin/')) return `/api/admin/${p.slice('/admin/'.length)}`;
    if (p.startsWith('/api/')) return p;
    if (p.startsWith('/')) return `/api/admin${p}`;
    return p;
  }
  return p;
}

const BE = backendRoutes();
const statusCache = new Map();
function classify(helper, method, rawPath) {
  const clean = rawPath.split('?')[0].replace(/\/+$/, '') || '/';
  const bff = toBffPath(helper, clean);
  const key = `${method} ${bff}`;
  if (statusCache.has(key)) return statusCache.get(key);
  let r;
  if (bff.startsWith('DIR:')) {
    const back = bff.slice(4);
    const m = matchRoute(BE, method, back);
    r = { status: 'BAD_URL', bff, backendPath: back, backend: m.route?.src, route: m.route, note: `fetchDirectory() runs inside getServerSideProps with a RELATIVE url ("${back}"); Node fetch throws on a relative URL and the catch returns [], so the page always renders empty${m.status === 'OK' ? '' : `; also ${m.status} on the backend`}` };
  } else if (helper === 'raw' && /^(:param)?\/api\/v1\//.test(bff)) {
    const back = bff.replace(/^(:param)?\/api\/v1/, '');
    const m = matchRoute(BE, method, back);
    r = { status: m.status, bff, backendPath: back, backend: m.route?.src, route: m.route, note: `server-side direct backend call (no BFF)${m.status === 'OK' ? '' : `: ${m.status}`}` };
  } else if (!bff.startsWith('/api/admin')) {
    r = { status: 'NO_ROUTE', bff, note: /^https?:/.test(bff) ? 'absolute URL' : 'path does not go through /api/admin (the BFF), so it hits Next, not the backend' };
  } else {
    const h = matchBff(bff);
    if (h) r = { status: 'BFF', bff, backend: rel(h.f), note: 'handled by a specific Next BFF handler' };
    else {
      const back = bff.replace(/^\/api\/admin/, '') || '/';
      const m = matchRoute(BE, method, back);
      r = { status: m.status, bff, backendPath: back, backend: m.route?.src, route: m.route, note: m.status === 'WRONG_METHOD' ? `backend has ${m.methods.join(', ')}` : m.status === 'NO_ROUTE' ? `no controller declares ${back}` : undefined };
    }
  }
  statusCache.set(key, r);
  return r;
}

/* ------------------------------------------------------------------ per-file analysis */
const PLACEHOLDER = /TODO|FIXME|coming soon|lorem ipsum|قريباً|قريبا|قيد التطوير|قيد الإنشاء|سيتم (?:إضافة|توفير|ربط)|placeholder data|dummy|not implemented|غير متاح حالياً/i;
const OPTION_NAME = /(option|column|tab|filter|step|nav|menu|status|type|label|kind|field|header|route|map|tone|color|colour|section|preset|role|permission|currenc|unit|lang|sort|period|range|template|channel|group|category|categories|mode|severity|priority|reason|action|stage|level|icon|day|month|region|gender|payment|method|kpi|card)s?$/i;
const MESSAGE_SETTER = /^set(Msg|Message|Notice|Toast|Error|Err|Feedback|Info|Success|Alert|Flash|Banner)$/;
const MESSAGE_FN = /^(alert|toast|showToast|notify|setToast|pushToast|addToast)$/;
const SENSITIVE = /(execute|withdraw|ban|approve|reject|refund|suspend|reactivate|delete|revoke|block|ban|cancel|payout|compensat|reassign|override|publish|deactivate|resolve|settle|price|controlled|prescription|flag|feature|impersonat|rbac|role|permission|credit|debit|release)/i;

const elementsByRoute = new Map();
const callsByRoute = new Map();
const routeMeta = new Map();

function analyseUnit(entry, route) {
  const files = unitFiles(entry);
  const calls = [];
  const els = [];
  const emit = (e) => els.push(e);

  for (const [file, via] of files) {
    const sf = parse(file);
    const cm = constMap(sf);
    const decls = new Map(); // name -> [fn nodes]
    const addDecl = (name, node) => { if (!decls.has(name)) decls.set(name, []); decls.get(name).push(node); };
    const walkDecl = (n) => {
      if (ts.isFunctionDeclaration(n) && n.name) addDecl(n.name.text, n);
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
        const i = unwrap(n.initializer);
        if (ts.isArrowFunction(i) || ts.isFunctionExpression(i)) addDecl(n.name.text, i);
        else if (ts.isCallExpression(i) && i.arguments.length && /useCallback|useMemo/.test(i.expression.getText())) { const a = unwrap(i.arguments[0]); if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) addDecl(n.name.text, a); }
      }
      ts.forEachChild(n, walkDecl);
    };
    walkDecl(sf);
    const imported = new Set();
    for (const st of sf.statements) if (ts.isImportDeclaration(st) && st.importClause) {
      const c = st.importClause;
      if (c.name) imported.add(c.name.text);
      if (c.namedBindings && ts.isNamedImports(c.namedBindings)) for (const e of c.namedBindings.elements) imported.add(e.name.text);
    }

    // state vars
    const stateVars = new Map(); // name -> {setter, init, line}
    const f0 = (n) => {
      if (ts.isVariableDeclaration(n) && n.initializer && ts.isArrayBindingPattern(n.name) && ts.isCallExpression(unwrap(n.initializer)) && /^(React\.)?useState$/.test(unwrap(n.initializer).expression.getText())) {
        const els2 = n.name.elements.filter((e) => ts.isBindingElement(e));
        if (els2.length && ts.isIdentifier(els2[0].name)) stateVars.set(els2[0].name.text, { setter: els2[1] && ts.isIdentifier(els2[1].name) ? els2[1].name.text : null, init: unwrap(n.initializer).arguments[0], line: lineOf(n) });
      }
      ts.forEachChild(n, f0);
    };
    f0(sf);
    const stateSetters = new Set([...stateVars.values()].map((v) => v.setter).filter(Boolean));
    const setterToVar = new Map([...stateVars].filter(([, v]) => v.setter).map(([k, v]) => [v.setter, k]));

    // ---- requests inside any node
    const requestsIn = (root) => {
      const out = [];
      const f = (n) => {
        if (ts.isCallExpression(n)) {
          const callee = n.expression;
          let name = ts.isIdentifier(callee) ? callee.text : null;
          if (!name && ts.isPropertyAccessExpression(callee) && callee.expression.getText() === 'window' && callee.name.text === 'fetch') name = 'fetch';
          if (name && Object.hasOwn(HELPERS, name) && !(name === 'fetch' && decls.has('fetch'))) {
            const a0 = n.arguments[0];
            if (a0) {
              const raw = pathOf(a0, cm);
              let methods, note, hasBody;
              if (name === 'adminMutation') { const m = n.arguments[1]; methods = m && (ts.isStringLiteral(unwrap(m))) ? [unwrap(m).text.toUpperCase()] : ['POST']; hasBody = n.arguments.length > 2; }
              else ({ methods, note, hasBody } = methodsOf(n.arguments[1], cm));
              out.push({ helper: HELPERS[name], fn: name, raw, methods, note, hasBody, file: rel(file), line: lineOf(n), node: n });
            }
          }
          // downloads: window.open(url) / location.assign(url)
          if (ts.isPropertyAccessExpression(callee) && /^(window\.open|window\.location\.assign|location\.assign|window\.location\.replace)$/.test(callee.getText()) && n.arguments[0]) {
            const raw = pathOf(n.arguments[0], cm);
            if (raw && /^\/api\//.test(raw)) out.push({ helper: 'toBffUrl', fn: 'window.open', raw, methods: ['GET'], file: rel(file), line: lineOf(n), node: n, download: true });
          }
        }
        ts.forEachChild(n, f);
      };
      f(root);
      return out;
    };
    const expandRaw = (raw) => {
      const mm = raw.match(new RegExp(`${MARK}([^${MARK}]+)${MARK}`));
      if (!mm) return [raw];
      return [...new Set(cm.propVals.get(mm[1]))].flatMap((v) => expandRaw(raw.replace(mm[0], v)));
    };
    const allReqs = requestsIn(sf).flatMap((r) => (r.raw != null && r.raw.includes(MARK) ? expandRaw(r.raw).map((x) => ({ ...r, raw: x, note: 'one of several endpoints chosen at runtime (tab config); the button may be hidden for this tab' })) : [r]));
    for (const r of allReqs) {
      if (r.raw == null && r.fn === 'fetch' && ts.isIdentifier(r.node.arguments[0]) && !cm.has(r.node.arguments[0].text)) continue; // wrapper: callers are traced
      if (r.raw == null) { calls.push({ method: r.methods[0], path: '(unresolved)', target: 'backend', status: 'UNRESOLVED', file: r.file, line: r.line, fn: r.fn, via, note: 'path is not a literal the tool can resolve' }); continue; }
      for (const m of r.methods) {
        const c = classify(r.helper, m, r.raw);
        const pathShown = r.raw.split('?')[0];
        calls.push({ method: m, path: pathShown, target: 'backend', status: c.status, backend: c.backend, backendPath: c.backendPath, note: [c.note, r.note].filter(Boolean).join('; ') || undefined, file: r.file, line: r.line, fn: r.fn, via, guards: c.route?.guards, routeFile: c.route?.file ? c.route.file : undefined, routeLine: c.route?.line, raw: r.fn === 'fetch' && /^\/api\/admin\//.test(r.raw) && m !== 'GET' });
      }
    }

    // ---- handler effect analysis
    const effCache = new Map();
    function effects(fn, depth = 0, seen = new Set()) {
      const e = { requests: [], nav: false, confirm: false, prompt: false, message: false, state: false, console: false, ext: false, unresolved: [], calls: 0 };
      if (!fn || depth > 4 || seen.has(fn)) return e;
      seen.add(fn);
      const body = fn.body ?? fn;
      e.requests.push(...requestsIn(body));
      const f = (n) => {
        if (ts.isCallExpression(n)) {
          e.calls++;
          const c = n.expression;
          const txt = c.getText();
          if (ts.isIdentifier(c)) {
            const nm = c.text;
            if (decls.has(nm) && !stateSetters.has(nm)) { const sub = effects(decls.get(nm)[0], depth + 1, seen); mergeE(e, sub); }
            else if (/^set[A-Z]/.test(nm)) { if (MESSAGE_SETTER.test(nm)) e.message = true; else e.state = true; }
            else if (MESSAGE_FN.test(nm) || nm === 'alert') e.message = true;
            else if (nm === 'confirm') e.confirm = true;
            else if (nm === 'prompt') e.prompt = true;
            else if (imported.has(nm) && !Object.hasOwn(HELPERS, nm) && !/^(use|apiErrorMessage|toQuery|dateLocale|formatDate)/.test(nm)) e.ext = true;
            else if (!Object.hasOwn(HELPERS, nm)) e.unresolved.push(nm);
          } else if (/^(window\.)?confirm$/.test(txt)) e.confirm = true;
          else if (/^(window\.)?prompt$/.test(txt)) e.prompt = true;
          else if (/^(window\.)?alert$/.test(txt) || /^toast\./.test(txt)) e.message = true;
          else if (/^(router|Router)\.(push|replace|back|reload)$/.test(txt) || /^(window\.)?(location|history)\./.test(txt) || /^window\.open$/.test(txt)) e.nav = true;
          else if (/^console\./.test(txt)) e.console = true;
          else if (/^(navigator\.clipboard|URL\.|document\.|Blob|FormData)/.test(txt)) e.ext = true;
        }
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /^(window\.)?location(\.href)?$/.test(n.left.getText())) e.nav = true;
        if (ts.isNewExpression(n) && /^(Blob|FormData)$/.test(n.expression.getText())) e.ext = true;
        ts.forEachChild(n, f);
      };
      f(body);
      return e;
    }
    function mergeE(a, b) {
      a.requests.push(...b.requests);
      for (const k of ['nav', 'confirm', 'prompt', 'message', 'state', 'console', 'ext']) a[k] = a[k] || b[k];
      a.unresolved.push(...b.unresolved);
      a.calls += b.calls;
    }
    function handlerOf(attrInit) {
      if (!attrInit || !ts.isJsxExpression(attrInit) || !attrInit.expression) return { kind: 'none' };
      const x = unwrap(attrInit.expression);
      if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return { kind: 'fn', fn: x };
      if (ts.isIdentifier(x)) {
        if (decls.has(x.text)) return { kind: 'fn', fn: decls.get(x.text)[0], name: x.text };
        if (x.text === 'undefined' || x.text === 'null') return { kind: 'none' };
        return { kind: 'prop', name: x.text };
      }
      if (ts.isPropertyAccessExpression(x)) return { kind: 'prop', name: x.getText() };
      if (ts.isConditionalExpression(x)) { const t = handlerOf({ ...attrInit, expression: x.whenTrue, kind: ts.SyntaxKind.JsxExpression }); return t; }
      if (ts.isCallExpression(x)) return { kind: 'fn', fn: { body: x } };
      return { kind: 'prop', name: x.getText() };
    }

    const textOf = (el) => {
      const parts = [];
      const f = (n) => {
        if (ts.isJsxText(n)) { const t = n.text.replace(/\s+/g, ' ').trim(); if (t) parts.push(t); }
        else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { if (/[A-Za-z؀-ۿ]/.test(n.text) && n.text.length < 80 && !/^[a-z-]+(\s[a-z0-9:/\-[\]]+)*$/.test(n.text) && !/(px|rounded|flex|text-|bg-|border)/.test(n.text)) parts.push(n.text); }
        if (ts.isJsxAttribute(n)) return;
        ts.forEachChild(n, f);
      };
      if (ts.isJsxElement(el)) el.children.forEach(f);
      return clip(parts.join(' '), 60);
    };
    const attrsOf = (open) => new Map(open.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a.initializer]));
    const strAttr = (init) => (init && ts.isStringLiteral(init) ? init.text : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(unwrap(init.expression)) ? unwrap(init.expression).text : null);

    const USED_COUNT = new Map();
    const identifierCounts = new Map();
    const countIds = (n) => { if (ts.isIdentifier(n)) identifierCounts.set(n.text, (identifierCounts.get(n.text) || 0) + 1); ts.forEachChild(n, countIds); };
    countIds(sf);
    void USED_COUNT;

    const ACTION_ATTRS = ['onClick', 'onSubmit', 'onConfirm', 'onSave', 'onApprove', 'onReject', 'onDelete', 'onToggle', 'onRowClick', 'onRefund', 'onAction', 'onCancel'];
    const mkSrc = (eff, hn) => {
      const bits = [];
      for (const r of eff.requests) bits.push(`${r.methods.join('/')} ${r.raw == null ? '(unresolved)' : r.raw.split('?')[0]}`);
      if (eff.confirm) bits.push('confirm()');
      if (eff.prompt) bits.push('prompt()');
      if (eff.nav) bits.push('navigation');
      if (!eff.requests.length && eff.state) bits.push('local state');
      if (!eff.requests.length && eff.ext) bits.push('helper/browser call');
      if (hn) bits.unshift(hn);
      return clip([...new Set(bits)].join('; '), 140);
    };

    const visit = (n) => {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        const open = ts.isJsxElement(n) ? n.openingElement : n;
        const tag = open.tagName.getText(sf);
        const attrs = attrsOf(open);
        const lc = tag.toLowerCase();
        const isBtn = lc === 'button';
        const isForm = lc === 'form';
        const isField = ['input', 'select', 'textarea'].includes(lc);
        const isLink = lc === 'a' || tag === 'Link';
        const label = (strAttr(attrs.get('aria-label')) || textOf(n) || strAttr(attrs.get('title')) || strAttr(attrs.get('placeholder')) || strAttr(attrs.get('name')) || '').trim();
        const actionAttrs = ACTION_ATTRS.filter((a) => attrs.has(a));
        const line = lineOf(n);
        const ref = { file: rel(file), line, via: via || undefined };

        if (isBtn || actionAttrs.length) {
          if (!actionAttrs.length) {
            const type = strAttr(attrs.get('type'));
            const inForm = (() => { for (let p = n.parent; p; p = p.parent) if ((ts.isJsxElement(p)) && p.openingElement.tagName.getText(sf).toLowerCase() === 'form') return true; return false; })();
            if (type === 'submit' || (inForm && type !== 'button')) emit({ kind: 'button', label: label || '(submit)', src: 'submits the enclosing form', status: 'ok', ...ref, submit: true });
            else if (attrs.has('disabled') && (strAttr(attrs.get('disabled')) === null) && attrs.get('disabled') === undefined) emit({ kind: 'button', label: label || '(icon)', src: 'disabled button, no handler', status: 'dead', note: 'Button is disabled with no handler.', ...ref });
            else if (/^(submit|reset)$/.test(type || '')) emit({ kind: 'button', label: label || '(submit)', src: 'form button', status: 'ok', ...ref });
            else emit({ kind: 'button', label: label || '(icon)', src: 'no onClick', status: 'dead', note: 'Button has no onClick and is not a submit button, so a tap does nothing.', ...ref });
          } else {
            for (const a of actionAttrs) {
              const h = handlerOf(attrs.get(a));
              const nm = label || `<${tag}> ${a}`;
              const kind = isForm ? 'form' : isBtn ? 'button' : 'action';
              if (h.kind === 'none') { emit({ kind, label: nm, src: `${a} is empty`, status: 'dead', note: `${a} is set to nothing, so nothing happens.`, ...ref }); continue; }
              if (h.kind === 'prop') { emit({ kind, label: nm, src: `${a} -> parent/prop callback ${clip(h.name, 40)}`, status: 'ok', untraced: true, ...ref }); continue; }
              const eff = effects(h.fn);
              const src = mkSrc(eff, h.name);
              const empty = !eff.calls && !(h.fn.body && ts.isBlock(h.fn.body) ? h.fn.body.statements.length : 1);
              let status = 'ok', note, warn;
              if (empty || (eff.console && !eff.requests.length && !eff.nav && !eff.state && !eff.message && !eff.ext)) { status = 'dead'; note = `${a} handler is empty or only console.log, so nothing happens.`; }
              else if (!eff.requests.length && !eff.nav && !eff.ext && !eff.state && (eff.message || eff.prompt || eff.confirm) && !eff.unresolved.length) { status = 'not wired'; note = `${a} handler only shows an alert/toast/prompt and sends no request (fake success).`; }
              else if (!eff.requests.length && !eff.nav && !eff.ext && !eff.state && !eff.unresolved.length && !eff.calls) { status = 'dead'; note = `${a} handler does nothing observable.`; }
              if (status === 'ok' && eff.requests.some((r) => r.methods.some((m) => m !== 'GET') || (r.fn === 'adminMutation')) && !eff.confirm && !eff.prompt) {
                const mut = eff.requests.filter((r) => r.methods.some((m) => m !== 'GET'));
                const sens = mut.find((r) => r.methods.includes('DELETE') || SENSITIVE.test(r.raw || '') || SENSITIVE.test(nm));
                if (sens) warn = `Sensitive action (${sens.methods.join('/')} ${(sens.raw || '').split('?')[0]}) runs on one tap with no confirm/prompt in the handler (a confirmation may live in the caller or a modal; verify).`;
              }
              emit({ kind, label: nm, src, status, ...(note ? { note } : {}), ...(warn ? { warn } : {}), mutation: eff.requests.some((r) => r.methods.some((m) => m !== 'GET')), confirm: eff.confirm || eff.prompt, ...ref });
            }
          }
        }
        if (isLink && !actionAttrs.length) {
          const href = attrs.get('href');
          const v = strAttr(href) ?? (href && ts.isJsxExpression(href) && href.expression ? pathOf(href.expression, cm) : null);
          if (href && (v === '#' || v === '' || v === 'javascript:void(0)')) emit({ kind: 'link', label: label || '(link)', src: `href="${v}"`, status: 'dead', note: 'Link goes nowhere (href is empty or #).', ...ref });
          else if (href && v && v.startsWith('/') && !v.startsWith('/api/')) emit({ kind: 'link', label: label || '(link)', src: `link ${v.split('?')[0]}`, status: 'ok', link: v.split('?')[0], ...ref });
          else if (href && v && /^\/api\//.test(v)) {
            const c = classify('toBffUrl', 'GET', v);
            calls.push({ method: 'GET', path: v.split('?')[0], target: 'backend', status: c.status, backend: c.backend, note: [c.note, 'download link'].filter(Boolean).join('; '), file: rel(file), line, fn: 'href', via, guards: c.route?.guards });
            emit({ kind: 'link', label: label || '(download)', src: `GET ${v.split('?')[0]} (${c.status})`, status: c.status === 'OK' || c.status === 'BFF' ? 'ok' : 'broken', ...(c.status === 'OK' || c.status === 'BFF' ? {} : { note: `Download link points to ${c.status}.` }), ...ref });
          }
        }
        if (isField) {
          const valueAttr = attrs.get('value') || attrs.get('checked');
          const chg = attrs.get('onChange');
          const type = strAttr(attrs.get('type')) || lc;
          if (attrs.get('disabled') && !valueAttr && !chg) { /* skip disabled decorative */ }
          else if (valueAttr && ts.isJsxExpression(valueAttr) && valueAttr.expression) {
            const root = (() => { let x = unwrap(valueAttr.expression); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isCallExpression(x) || ts.isBinaryExpression(x) || ts.isConditionalExpression(x)) x = unwrap(ts.isBinaryExpression(x) ? x.left : ts.isConditionalExpression(x) ? x.condition : x.expression); return ts.isIdentifier(x) ? x.text : null; })();
            if (!chg && !attrs.has('readOnly') && !attrs.has('disabled')) emit({ kind: 'input', label: label || type, src: `controlled value ${root || ''} without onChange`, status: 'broken', note: 'Controlled field has a value but no onChange, so it cannot be edited.', ...ref });
            else {
              const eff = chg ? (() => { const h = handlerOf(chg); return h.kind === 'fn' ? effects(h.fn) : null; })() : null;
              const sends = eff && eff.requests.length;
              if (sends) emit({ kind: 'input', label: label || type, src: `onChange sends ${mkSrc(eff)}`, status: 'ok', ...ref });
              else if (root && stateVars.has(root)) {
                const uses = identifierCounts.get(root) || 0;
                // declaration (1) + value attr (1) + onChange read (0-1): anything > 3 means it is used somewhere else
                const own = 1 + 1 + (chg && chg.getText().includes(root) ? 1 : 0);
                if (uses <= own) emit({ kind: 'input', label: label || type, src: `state ${root}`, status: 'not wired', note: `Input value (state "${root}") is never read by any request or logic.`, ...ref });
                else emit({ kind: 'input', label: label || type, src: `state ${root} used by logic/request`, status: 'ok', ...ref });
              } else emit({ kind: 'input', label: label || type, src: root ? `value ${root}` : 'value', status: 'ok', untraced: true, ...ref });
            }
          } else if (chg) {
            const h = handlerOf(chg);
            if (h.kind === 'fn') { const eff = effects(h.fn); emit({ kind: 'input', label: label || type, src: mkSrc(eff, h.name) || 'onChange', status: eff.requests.length || eff.state || eff.nav || eff.ext ? 'ok' : 'not wired', ...(eff.requests.length || eff.state || eff.nav || eff.ext ? {} : { note: 'onChange handler does nothing observable.' }), ...ref }); }
            else emit({ kind: 'input', label: label || type, src: `onChange -> ${h.name || 'prop'}`, status: 'ok', untraced: true, ...ref });
          } else if (type !== 'hidden' && !attrs.has('disabled') && !attrs.has('readOnly') && !attrs.has('ref') && !(attrs.has('name') || attrs.has('id') || attrs.has('defaultValue'))) {
            emit({ kind: 'input', label: label || type, src: 'no value, no onChange, no name', status: 'not wired', note: 'Input has no value, onChange, name or ref, so its content is never read.', ...ref });
          }
        }
        // mapped lists: x.map(...) rendered in JSX whose state is never set
      }
      // lists never filled
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'map' && ts.isIdentifier(unwrap(n.expression.expression))) {
        const nm = unwrap(n.expression.expression).text;
        const sv = stateVars.get(nm);
        if (sv && sv.setter && ts.isArrayLiteralExpression(unwrap(sv.init ?? ts.factory.createNull()) ?? {}) ) {
          const setUses = (identifierCounts.get(sv.setter) || 0) - 1;
          if (setUses <= 0 && ts.isJsxExpression(n.parent?.parent ?? {}) !== undefined) emit({ kind: 'data', label: `list ${nm}`, src: `useState(${clip(sv.init?.getText?.() || '[]', 30)}) never set`, status: 'broken', note: `List state "${nm}" is rendered but nothing ever calls ${sv.setter}(), so it is always empty or hard-coded.`, file: rel(file), line: sv.line, via: via || undefined });
        }
      }
      // hard-coded record arrays
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
        const arr = unwrap(n.initializer);
        const nm = n.name.text;
        if (ts.isArrayLiteralExpression(arr) && arr.elements.length >= 2 && arr.elements.every((x) => ts.isObjectLiteralExpression(unwrap(x))) && !OPTION_NAME.test(nm)) {
          const keys = new Set(arr.elements.flatMap((x) => unwrap(x).properties.map((p) => p.name?.getText())));
          const recordish = ['id', 'name', 'title', 'price', 'amount', 'total', 'status', 'date', 'email', 'phone', 'count'].filter((k) => keys.has(k)).length;
          if (recordish >= 2) emit({ kind: 'data', label: `hard-coded array ${nm}`, src: `${arr.elements.length} literal records (${[...keys].slice(0, 5).join(', ')})`, status: 'mock', note: `Hard-coded ${arr.elements.length}-record array "${nm}" looks like sample data (verify: may be a static option list).`, file: rel(file), line: lineOf(n), via: via || undefined });
        }
      }
      if (ts.isCallExpression(n) && /^Math\.random$/.test(n.expression.getText())) emit({ kind: 'data', label: 'Math.random()', src: 'random value', status: 'mock', note: 'Math.random() in the UI: the number shown is not real data.', file: rel(file), line: lineOf(n), via: via || undefined });
      if (ts.isCallExpression(n) && n.expression.getText() === 'setTimeout' && n.arguments[0]) {
        const t = n.arguments[0].getText();
        if (/set[A-Z]\w*\((?:false|null|'')\)|setLoading|setSaving/.test(t) && !requestsIn(n.arguments[0]).length && /(success|done|saved|ok|Success)/i.test(t) === true) emit({ kind: 'data', label: 'fake delay', src: 'setTimeout → success state', status: 'mock', note: 'setTimeout stands in for a request and reports success.', file: rel(file), line: lineOf(n), via: via || undefined });
      }
      if ((ts.isJsxText(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !(ts.isJsxAttribute(n.parent) && /^(placeholder|className|id|name|type|href|key|value|aria-.*|data-.*)$/.test(n.parent.name.getText()))) {
        const t = n.text;
        if (t.length < 200 && PLACEHOLDER.test(t) && !(ts.isImportDeclaration(n.parent))) emit({ kind: 'text', label: clip(t, 60), src: 'placeholder/coming-soon text', status: 'placeholder', note: `Placeholder or "coming soon" text: "${clip(t, 70)}".`, file: rel(file), line: lineOf(n), via: via || undefined });
        if (ts.isJsxText(n) && /^\s*(?=[\d,.]*\d)[\d,.]{3,}\s*$/.test(t)) emit({ kind: 'text', label: clip(t, 20), src: 'numeric literal in JSX', status: 'mock', note: `Hard-coded number "${t.trim()}" drawn in the page.`, file: rel(file), line: lineOf(n), via: via || undefined });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  // dedupe elements (same kind/label/src/line)
  const seen = new Set();
  const uniq = els.filter((e) => { const k = `${e.kind}|${e.label}|${e.src}|${e.file}|${e.line}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const seenC = new Set();
  const uniqC = calls.filter((c) => { const k = `${c.method} ${c.path} ${c.file}:${c.line}`; if (seenC.has(k)) return false; seenC.add(k); return true; });
  return { els: uniq, calls: uniqC, files: [...files.keys()].map(rel) };
}

/* ------------------------------------------------------------------ run */
const rows = [];
const elementsOut = {};
for (const f of pageFiles.sort()) {
  const route = routeOfFile(f);
  const { els, calls, files } = analyseUnit(f, route);
  const reqPerm = route.startsWith('/admin/') ? requiredPermissionFor(route) : undefined;
  const nav = NAV.find((n) => n.href === route);
  const navPerm = nav?.permission;
  const row = {
    app: 'admin', route, file: rel(f), line: 1, area: areaOf(route), unit: files,
    clientPermission: reqPerm ?? null, navPermission: navPerm ?? null, inNav: !!nav, navLine: nav ? NAV_LINE(route) : null,
    publicDirectory: route.startsWith('/admin/') ? false : (route === '/login' ? false : true),
    calls: calls.map(({ node, ...c }) => c),
  };
  // guard findings
  const gf = [];
  for (const c of row.calls) {
    if (!c.guards) continue;
    const g = c.guards;
    const mut = c.method !== 'GET';
    if (!g.public && !g.roles.length && !g.perms.length) gf.push({ code: 'G-OPEN', call: c, note: `${c.method} ${c.backendPath} has no @Roles, @RequirePermissions or @Public: JwtAuthGuard lets ANY signed-in user (patient/provider) through${(c.backendPath || '').startsWith('/admin') ? '; only the network gate (ADMIN_GATE_TOKEN) stops them' : '; and the path is outside /admin, so there is no network gate either'}.`, severity: /^\/(auth|storage|support-session)\//.test(c.backendPath || '') ? 'low' : (c.backendPath || '').startsWith('/admin') ? (mut ? 'medium' : 'low') : (mut ? 'high' : 'medium') });
    if (g.public && route.startsWith('/admin/') && mut) gf.push({ code: 'G-PUBLIC', call: c, note: `${c.method} ${c.backendPath} is @Public (no auth at all) but the admin page uses it${mut ? ' for a write' : ''}.`, severity: mut ? 'high' : 'low' });
    if (route.startsWith('/admin/') && g.perms.length) {
      const bad = g.perms.filter((p) => !PERM_VALUES.has(p));
      if (bad.length) gf.push({ code: 'G-VOCAB-BE', call: c, note: `backend requires unknown permission ${bad.join(', ')}`, severity: 'high' });
      if (!reqPerm) gf.push({ code: 'G-PAGE-NOPERM', call: c, note: `Page has no client permission (any admin sees it) but ${c.method} ${c.backendPath} requires ${g.perms.join(', ')}; roles without it get a 403 inside the page.`, severity: 'low' });
      else if (!g.perms.includes(reqPerm)) gf.push({ code: 'G-PERM-MISMATCH', call: c, note: `Page requires "${reqPerm}" but ${c.method} ${c.backendPath} requires ${g.perms.join(' + ')}; an admin role with the page permission only gets a 403 on this call.`, severity: 'medium' });
    }
    if (mut && !g.public && g.roles.length && !g.perms.length && SENSITIVE.test(c.backendPath || '')) gf.push({ code: 'G-ROLE-ONLY-WRITE', call: c, note: `${c.method} ${c.backendPath} is protected by role only (no @RequirePermissions): every admin role, including a custom restricted one, can run it.`, severity: 'medium' });
  }
  if (route.startsWith('/admin/')) {
    for (const p of [reqPerm, navPerm].filter(Boolean)) if (!PERM_VALUES.has(p)) gf.push({ code: 'G-VOCAB-FE', note: `client permission "${p}" is not in backend Permission enum: the page/nav link is hidden or locked for every role.`, severity: 'high', clientOnly: true });
    if (navPerm && reqPerm && navPerm !== reqPerm) gf.push({ code: 'G-NAV-MISMATCH', note: `nav item requires "${navPerm}" but the page route requires "${reqPerm}": link visible while page denies, or the reverse.`, severity: 'low', clientOnly: true });
    if (!reqPerm && !navPerm && row.calls.some((c) => c.guards?.perms.length) === false && row.calls.length) { /* no permission anywhere, backend role-only: fine for admin */ }
  }
  for (const c of row.calls) if (c.raw) gf.push({ code: 'G-RAW-WRITE', call: c, note: `${c.method} ${c.path} uses raw fetch() instead of adminFetch/adminMutation, so no x-admin-csrf header is sent and the BFF will answer 403 csrf_validation_failed.`, severity: 'medium' });
  { const seenG = new Set(); gf.splice(0, gf.length, ...gf.filter((g) => { const k = `${g.code}|${g.call?.method}|${g.call?.path}`; if (seenG.has(k)) return false; seenG.add(k); return true; })); }
  row.guardFindings = gf.map(({ call, ...g }) => ({ ...g, ...(call ? { method: call.method, path: call.path, file: call.file, line: call.line, backend: call.backend } : {}) }));
  routeMeta.set(route, row);
  rows.push(row);
  elementsOut[route] = els;
}

// not in nav / orphan pages
const navHrefs = new Set(NAV.map((n) => n.href));
for (const r of rows) r.orphan = r.route.startsWith('/admin/') && !navHrefs.has(r.route) && !/\[/.test(r.route);
// nav links to a page that does not exist
const routeSet = new Set(rows.map((r) => r.route));
const deadNav = NAV.filter((n) => !routeSet.has(n.href));

// backend admin routes never called by any admin page
const calledKeys = new Set(rows.flatMap((r) => r.calls.filter((c) => c.backend).map((c) => c.backend)));
const adminBackend = BE.filter((b) => b.p.startsWith('/admin'));
const uncalled = adminBackend.filter((b) => !calledKeys.has(b.src));
const openAdmin = adminBackend.filter((b) => !b.guards.public && !b.guards.roles.length && !b.guards.perms.length);
const publicAdmin = adminBackend.filter((b) => b.guards.public);
// non-/admin backend routes that the admin pages call
const outsideAdmin = [...new Map(rows.flatMap((r) => r.calls).filter((c) => c.backendPath && !c.backendPath.startsWith('/admin') && c.backend).map((c) => [c.backend, c])).values()];

/* ------------------------------------------------------------------ outputs */
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const sum = (f) => rows.reduce((t, r) => t + f(r), 0);
const allCalls = rows.flatMap((r) => r.calls);
const cnt = (s) => allCalls.filter((c) => c.status === s).length;
const elCnt = {};
for (const e of Object.values(elementsOut).flat()) elCnt[e.status] = (elCnt[e.status] || 0) + 1;

const INV = [];
INV.push('# Admin inventory', '', '_Generated by `tools/design/admin-inventory.mjs` (read-only audit: nothing was fixed, no UI was built). Do not edit by hand._', '');
INV.push(`Pages: ${rows.length} (${rows.filter((r) => r.route.startsWith('/admin/')).length} admin console pages, ${rows.filter((r) => r.publicDirectory).length} public directory pages hosted inside admin, ${rows.filter((r) => r.route === '/login').length} login). API call sites: ${allCalls.length} (distinct method+path ${new Set(allCalls.map((c) => c.method + ' ' + c.path)).size}). Backend admin routes (path starts with /admin): ${adminBackend.length}.`, '');
INV.push('Path rule: `adminFetch` / `adminMutation` prefix `/api/admin` to a path that does not start with it; `fetchWithAdminGuard` / `apiFetch` map `/admin/x` and `/api/v1/admin/x` to `/api/admin/x` (the leading `admin/` is dropped, so the backend sees `/x`); the BFF `pages/api/admin/[...path].ts` then forwards `/api/admin/<x>` to backend `/api/v1/<x>`.', '');
INV.push('| Area | Page | Client permission | In nav | API calls (OK / problems) | Elements (ok / not ok) | Where |', '|---|---|---|---|---|---|---|');
for (const r of rows.slice().sort((a, b) => a.area.localeCompare(b.area) || a.route.localeCompare(b.route))) {
  const bad = r.calls.filter((c) => c.status !== 'OK' && c.status !== 'BFF').length;
  const el = elementsOut[r.route];
  INV.push(`| ${r.area} | ${code(r.route)} | ${r.clientPermission ? code(r.clientPermission) : (r.route.startsWith('/admin/') ? '**none**' : '—')} | ${r.inNav ? 'yes' : r.route.startsWith('/admin/') && !/\[/.test(r.route) ? '**no**' : '—'} | ${r.calls.length - bad} / ${bad} | ${el.filter((e) => e.status === 'ok').length} / ${el.filter((e) => e.status !== 'ok').length} | ${code(r.file)} |`);
}
INV.push('', '## API calls per page', '');
for (const r of rows.slice().sort((a, b) => a.route.localeCompare(b.route))) {
  if (!r.calls.length) { INV.push(`### ${code(r.route)}`, '', '_No API call in the page or its local components._', ''); continue; }
  INV.push(`### ${code(r.route)}`, '', '| Method | Path | Status | Backend | Guard (public / roles / permissions) | Call site |', '|---|---|---|---|---|---|');
  for (const c of r.calls) INV.push(`| ${c.method} | ${code(c.path)} | ${c.status}${c.note ? ` (${esc(c.note)})` : ''} | ${c.backend ? code(c.backend) : ''} | ${c.guards ? esc(`${c.guards.public ? 'PUBLIC' : ''}${c.guards.roles.length ? ' roles:' + c.guards.roles.join(',') : ''}${c.guards.perms.length ? ' perms:' + c.guards.perms.join(',') : ''}`.trim() || 'NONE') : ''} | ${code(`${c.file}:${c.line}`)} |`);
  INV.push('');
}
INV.push('## Nav links', '', `${NAV.length} links in \`AdminGuard.tsx\` NAV_SECTIONS. Links to a page that does not exist: ${deadNav.length ? deadNav.map((n) => code(n.href)).join(', ') : 'none'}. Pages with no nav link (reachable only by URL or from another page): ${rows.filter((r) => r.orphan).map((r) => code(r.route)).join(', ') || 'none'}.`, '');
const invMd = INV.join('\n');

// ---- wiring report
const W = [];
W.push('# Admin wiring report', '', '_Generated by `tools/design/admin-inventory.mjs`; per-area element tables are `docs/design/audit/admin-<area>.md`, Needs-review lines are `docs/design/needs-review/admin-<area>.json`. Read-only audit: nothing was fixed._', '');
W.push('## Totals', '');
W.push(`- Pages: ${rows.length}; call sites: ${allCalls.length}; OK ${cnt('OK')}, BFF ${cnt('BFF')}, NO_ROUTE ${cnt('NO_ROUTE')}, WRONG_METHOD ${cnt('WRONG_METHOD')}, UNRESOLVED ${cnt('UNRESOLVED')}.`);
W.push(`- Elements: ${Object.values(elCnt).reduce((a, b) => a + b, 0)} (${Object.entries(elCnt).map(([k, v]) => `${v} ${k}`).join(', ')}).`);
W.push(`- Guard findings on pages: ${rows.reduce((t, r) => t + r.guardFindings.length, 0)} (${Object.entries(rows.flatMap((r) => r.guardFindings).reduce((m, g) => ((m[g.code] = (m[g.code] || 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(', ')}).`);
W.push(`- Backend admin routes: ${adminBackend.length}; never called by an admin page: ${uncalled.length}; with NO guard at all (no @Roles / @RequirePermissions / @Public): ${openAdmin.length}; @Public: ${publicAdmin.length}.`);
W.push(`- Backend routes outside \`/admin\` that admin pages call: ${outsideAdmin.length} (the network gate does not cover them; they rely on role guards only).`, '');
W.push('## Broken calls (NO_ROUTE / WRONG_METHOD / UNRESOLVED)', '');
const brokenCalls = rows.flatMap((r) => r.calls.filter((c) => !['OK', 'BFF'].includes(c.status)).map((c) => ({ r, c })));
if (!brokenCalls.length) W.push('None.', '');
else { W.push('| Page | Call | Status | Note | Call site |', '|---|---|---|---|---|'); for (const { r, c } of brokenCalls) W.push(`| ${code(r.route)} | ${c.method} ${code(c.path)} | ${c.status} | ${esc(c.note)} | ${code(`${c.file}:${c.line}`)} |`); W.push(''); }
W.push('## Role-guard findings', '');
W.push('Rules: `JwtAuthGuard` is global; a route with no `@Roles`, no `@RequirePermissions` and no `@Public` lets any signed-in user through; `AdminGateGuard` additionally requires the BFF secret header only for paths under `/api/v1/admin`. Handler decorators override class decorators (`getAllAndOverride`).', '');
const guardRows = rows.flatMap((r) => r.guardFindings.map((g) => ({ r, g })));
W.push('| Code | Severity | Page | Finding | Where |', '|---|---|---|---|---|');
const sevRank = { high: 0, medium: 1, low: 2 };
for (const { r, g } of guardRows.slice().sort((a, b) => sevRank[a.g.severity] - sevRank[b.g.severity] || a.g.code.localeCompare(b.g.code))) W.push(`| ${g.code} | ${g.severity} | ${code(r.route)} | ${esc(g.note)} | ${code(g.file ? `${g.file}:${g.line}` : `${r.file}`)}${g.backend ? ` (backend ${code(g.backend)})` : ''} |`);
W.push('', '### Backend admin routes with no guard at all', '');
W.push(openAdmin.length ? '| Route | Source |\n|---|---|\n' + openAdmin.map((b) => `| ${b.m} ${code(b.p)} | ${code(b.src)} |`).join('\n') : 'None.', '');
W.push('### Backend admin routes that are @Public', '');
W.push(publicAdmin.length ? '| Route | Source |\n|---|---|\n' + publicAdmin.map((b) => `| ${b.m} ${code(b.p)} | ${code(b.src)} |`).join('\n') : 'None.', '');
W.push('### Routes outside /admin called by admin pages (guard summary)', '', '| Route | Guard | Source |', '|---|---|---|');
for (const c of outsideAdmin) W.push(`| ${c.method} ${code(c.backendPath)} | ${esc(`${c.guards.public ? 'PUBLIC ' : ''}${c.guards.roles.length ? 'roles:' + c.guards.roles.join(',') + ' ' : ''}${c.guards.perms.length ? 'perms:' + c.guards.perms.join(',') : ''}`.trim() || 'NONE')} | ${code(c.backend)} |`);
W.push('', '## Non-ok elements (all areas)', '', '| Page | Element | Status | Note | Where |', '|---|---|---|---|---|');
for (const r of rows) for (const e of elementsOut[r.route]) if (e.status !== 'ok') W.push(`| ${code(r.route)} | ${esc(e.kind + ': ' + clip(e.label, 50))} | ${e.status} | ${esc(e.note)} | ${code(`${e.file}:${e.line}`)} |`);
W.push('', '## Sensitive actions without a confirm/prompt in the handler', '', '| Page | Element | Warning | Where |', '|---|---|---|---|');
for (const r of rows) for (const e of elementsOut[r.route]) if (e.warn) W.push(`| ${code(r.route)} | ${esc(clip(e.label, 50))} | ${esc(e.warn)} | ${code(`${e.file}:${e.line}`)} |`);
W.push('', '## Backend admin routes never called by an admin page', '', `${uncalled.length} of ${adminBackend.length} (leads only: they may be used by another client or be dead code).`, '');
{
  const byFile = new Map();
  for (const b of uncalled) { const f = b.src.split(':')[0]; if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(b); }
  W.push('| Controller file | Count | Examples |', '|---|---|---|');
  for (const [f, l] of [...byFile].sort((a, b) => b[1].length - a[1].length)) W.push(`| ${code(f)} | ${l.length} | ${l.slice(0, 4).map((b) => `${b.m} ${b.p}`).join('; ')} |`);
}
W.push('', '## Public directory pages inside admin', '');
for (const r of rows.filter((x) => x.publicDirectory)) W.push(`- ${code(r.route)} (${code(r.file)}): ${r.calls.length ? r.calls.map((c) => `${c.method} ${c.path} [${c.status}]`).join('; ') : 'no API call'}; behind the admin session guard? ${r.file.includes('pages/admin') ? 'yes' : 'NO: not under /admin, the proxy.ts matcher only forces login for paths starting /admin, so it is served to anyone'}.`);
W.push('', '## Limits', '', '- Static, heuristic (TypeScript AST). Props passed by a parent into a child are not traced beyond depth 2 of local imports; a handler given as a prop is reported `ok` (parent callback) and not followed.', '- Response field names are not compared with backend DTOs; request bodies are not compared with DTOs (run `tools/audit/dtocheck.js` for that).', '- Guard extraction reads decorators textually (class + handler); custom guards named in `@UseGuards` other than JwtAuthGuard are listed, not evaluated.', '- Hard-coded record arrays are leads (`mock`): option lists with record-like keys can be false positives; reviewed ones are overridden in `docs/design/inventory/admin-audit-overrides.json`.', '- No runtime check: no admin account was signed in against a seeded backend in this audit.', '');
const wireMd = W.join('\n');

const screensJson = JSON.stringify({ generated: 'tools/design/admin-inventory.mjs', nav: NAV, routePermissions: ROUTE_PERMS, deadNav, routes: rows }, null, 1) + '\n';
const elementsJson = JSON.stringify({ generated: 'tools/design/admin-inventory.mjs', screens: elementsOut }, null, 1) + '\n';
const summaryJson = JSON.stringify({ backend: { adminRoutes: adminBackend.length, uncalled: uncalled.length, noGuard: openAdmin.map((b) => ({ m: b.m, p: b.p, src: b.src })), public: publicAdmin.map((b) => ({ m: b.m, p: b.p, src: b.src })) }, outsideAdmin: outsideAdmin.map((c) => ({ m: c.method, p: c.backendPath, src: c.backend, guards: c.guards })) }, null, 1) + '\n';

const targets = [
  ['docs/design/ADMIN_INVENTORY.md', invMd],
  ['docs/design/ADMIN_WIRING_REPORT.md', wireMd],
  ['docs/design/inventory/admin-screens.json', screensJson],
  ['docs/design/inventory/admin-elements.json', elementsJson],
  ['docs/design/inventory/admin-backend-guards.json', summaryJson],
];
if (CHECK) {
  const stale = targets.filter(([p, c]) => !existsSync(join(REPO, p)) || read(join(REPO, p)) !== c);
  if (stale.length) { for (const [p] of stale) console.error(`stale: ${p}: run node tools/design/admin-inventory.mjs`); process.exit(1); }
  console.log('admin-inventory: check ok');
} else {
  for (const [p, c] of targets) { mkdirSync(dirname(join(REPO, p)), { recursive: true }); writeFileSync(join(REPO, p), c); }
  console.log(`admin-inventory: ${rows.length} pages, ${allCalls.length} call sites (OK ${cnt('OK')}, BFF ${cnt('BFF')}, NO_ROUTE ${cnt('NO_ROUTE')}, WRONG_METHOD ${cnt('WRONG_METHOD')}, UNRESOLVED ${cnt('UNRESOLVED')}), elements ${JSON.stringify(elCnt)}, guard findings ${guardRows.length}`);
}
