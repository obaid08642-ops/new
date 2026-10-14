#!/usr/bin/env node
/**
 * Screen inventory + API wiring report for the design rebuild
 * (docs/design/DESIGN_HANDOFF_FINAL.md §4).
 *
 *   node tools/design/screen-inventory.mjs            # writes the three files below
 *   node tools/design/screen-inventory.mjs --check    # exit 1 if the committed files are stale
 *
 * Writes:
 *   docs/design/SCREEN_INVENTORY.md   one row per route (patient-app + patient-web):
 *                                     template, closest board, batch, API endpoints
 *   docs/design/WIRING_REPORT.md      every endpoint a screen calls, checked against the backend
 *                                     controllers (and, on the web, the BFF route handlers and the
 *                                     /api/patient proxy allowlist); design-foundation status
 *   docs/design/inventory/screens.json   the same data, machine-readable
 *
 * How endpoints are found (static, TypeScript AST — no regex on source):
 *   - Routes: expo-router files under patient-app/app, Next pages under patient-web/app/[locale].
 *   - From each route file the script follows imports SYMBOL BY SYMBOL: a screen that imports
 *     `{ getOrders }` from a service only gets the endpoints inside `getOrders` (and whatever that
 *     function references), not every endpoint in the service file.
 *   - A call is an API call when its callee is one of CALLERS and its first argument is a string or
 *     template literal starting with "/" (or `${base}/...`). Template holes become `:param`.
 *   - Method: from the callee (`http.post`) or the `method:` property of the options object.
 *     A call whose options are not an object literal is reported with method `*`.
 * Calls built from variables are resolved three ways, or counted as "unresolved":
 *   - generic wrappers (a function that forwards its own parameter to fetch) are not unresolved: the path is
 *     attributed at each caller, and the report counts those callers;
 *   - request builders (`buildX(...)` returning `{ path, body }` or `[url, init]`) are followed to the returned path;
 *   - docs/design/inventory/manual-calls.json maps "file:line" to {method, path, note}; a stale entry fails the run.
 * Other inputs merged into WIRING_REPORT.md: docs/design/needs-review/*.json (Needs review),
 * docs/design/inventory/static-screens.json (web screens with no API call), tools/design/mock-scan.mjs (mock scan).
 * Limits (stated in the report): layout files (_layout.tsx / layout.tsx) are not attributed to routes.
 *
 * TypeScript is loaded from backend/, patient-web/ or patient-app/ node_modules, else from NODE_PATH.
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildProvider } from './provider-inventory.mjs';
import { scanMock, CATEGORIES as MOCK_CATEGORIES, isScanned } from './mock-scan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const CHECK = process.argv.includes('--check');

function loadTs() {
  const req = createRequire(import.meta.url);
  for (const base of ['backend', 'patient-web', 'patient-app']) {
    const p = join(REPO, base, 'node_modules', 'typescript');
    if (existsSync(p)) return req(p);
  }
  try {
    return req('typescript');
  } catch {
    console.error('typescript not found: run `npm ci` in backend/ (or set NODE_PATH to a node_modules that has it)');
    process.exit(2);
  }
}
const ts = loadTs();

const rel = (p) => relative(REPO, p).split(sep).join('/');
const read = (p) => readFileSync(p, 'utf8');
const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!/^(node_modules|__tests__|\.next|dist|build)$/.test(e.name)) walk(p, pred, out);
    } else if (pred(p)) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ apps */

const APPS = {
  'patient-app': {
    root: join(REPO, 'patient-app'),
    routesDir: join(REPO, 'patient-app/app'),
    // tsconfig "paths" (patient-app/tsconfig.json), most specific first
    aliases: [
      ['@nabd/ui-native', 'packages/ui-native/src/Icon.tsx'],
      ['@nabd/ui/', 'packages/ui/'],
      ['@/design-system', 'patient-app/src/design-system/index.ts'],
      ['@/theme', 'patient-app/src/theme/index.ts'],
      ['@/store', 'patient-app/src/store/index.ts'],
      ['@/types', 'patient-app/src/types/index.ts'],
      ['@/constants', 'patient-app/src/constants/index.ts'],
      ['@/i18n', 'patient-app/src/i18n/index.ts'],
      ['@/guided-tour', 'patient-app/src/guided-tour/index.ts'],
      ['@/assets/', 'patient-app/assets/'],
      ['@/', 'patient-app/src/'],
    ],
    exts: ['.native.tsx', '.native.ts', '.ios.tsx', '.ios.ts', '.tsx', '.ts', '.js', '.jsx'],
  },
  'provider-app': {
    root: join(REPO, 'provider-app'),
    routesDir: join(REPO, 'provider-app/src/screens'),
    aliases: [],
    exts: ['.native.tsx', '.native.ts', '.ios.tsx', '.ios.ts', '.tsx', '.ts', '.js', '.jsx'],
  },
  'patient-web': {
    root: join(REPO, 'patient-web'),
    routesDir: join(REPO, 'patient-web/app/[locale]'),
    aliases: [
      ['@nabd/design-tokens/', 'packages/design-tokens/'],
      ['@nabd/design-tokens', 'packages/design-tokens/dist/ts/tokens.ts'],
      ['@nabd/ui/', 'packages/ui/'],
      ['@nabd/ui', 'packages/ui/src/index.ts'],
      ['@/app/', 'patient-web/app/'],
      ['@/components/', 'patient-web/components-next/'],
      ['@/lib/', 'patient-web/lib/'],
      ['@/', 'patient-web/'],
    ],
    exts: ['.tsx', '.ts', '.js', '.jsx', '.mjs'],
  },
};

function patientAppRoutes() {
  const app = APPS['patient-app'];
  return walk(app.routesDir, (p) => /\.tsx$/.test(p))
    .filter((p) => {
      const b = p.split(sep).pop();
      return !b.startsWith('_layout') && !b.startsWith('+') && !/\.(test|spec)\./.test(b);
    })
    .map((file) => {
      const r = relative(app.routesDir, file).split(sep).join('/').replace(/\.tsx$/, '');
      let route = '/' + r.replace(/(^|\/)\([^)]+\)/g, '').replace(/^\/+/, '');
      route = route.replace(/\/index$/, '') || '/';
      if (route === '/index') route = '/';
      // groups such as (auth)/(onboarding) vanish from the URL but say what the screen is
      const group = r.match(/^\((auth|onboarding)\)\//);
      const classRoute = !group ? route : group[1] === 'auth' ? route : route === '/' ? '/onboarding' : `/onboarding${route}`;
      return { app: 'patient-app', route, classRoute, file };
    });
}

function patientWebRoutes() {
  const app = APPS['patient-web'];
  return walk(app.routesDir, (p) => p.endsWith(`${sep}page.tsx`)).map((file) => {
    const d = relative(app.routesDir, dirname(file)).split(sep).join('/');
    const route = '/' + d.replace(/(^|\/)\([^)]+\)/g, '').replace(/^\/+/, '');
    return { app: 'patient-web', route: route === '/' ? '/' : route.replace(/\/$/, ''), file };
  });
}

/* ------------------------------------------------------ module resolution */

function resolveSpec(appKey, fromFile, spec) {
  const app = APPS[appKey];
  let base = null;
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else {
    // "x/" = wildcard alias (tsconfig "x/*"), "x" = exact alias
    for (const [prefix, target] of app.aliases) {
      if (prefix.endsWith('/') ? spec.startsWith(prefix) : spec === prefix) {
        base = join(REPO, target, prefix.endsWith('/') ? spec.slice(prefix.length) : '');
        break;
      }
    }
  }
  if (!base) return null; // node_modules package
  if (isFile(base) && /\.(tsx?|jsx?|mjs)$/.test(base)) return base;
  for (const e of app.exts) if (isFile(base + e)) return base + e;
  for (const e of app.exts) if (isFile(join(base, 'index' + e))) return join(base, 'index' + e);
  return null;
}

/* ---------------------------------------------------------- file analysis */

const CALLER_FUNCS = new Set([
  'apiFetch', 'fetch', 'callPatientApi', 'patientFetch', 'fetchJson', 'apiRequest', 'request',
  'adminFetch', 'authFetch', 'publicFetch', 'serverFetch', 'backendFetch', 'fetchApi', 'apiGet',
  'apiPost', 'apiPut', 'apiPatch', 'apiDelete', 'upstreamFetch', 'HttpClient',
]);
const CALLER_OBJECTS = /^(api|apiClient|client|http|httpClient|HttpClient|axios|instance|request|fetcher)$/i;
const VERBS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function isCallerCallee(callee, sf) {
  if (ts.isIdentifier(callee)) return CALLER_FUNCS.has(callee.text);
  if (ts.isPropertyAccessExpression(callee)) {
    const obj = callee.expression.getText(sf).replace(/^this\./, '');
    // `request` is also a permission/dialog verb (`permissions.request(key)`): only an HTTP-client object counts
    if (callee.name.text === 'request') return CALLER_OBJECTS.test(obj);
    return (VERBS.has(callee.name.text) && CALLER_OBJECTS.test(obj)) || CALLER_FUNCS.has(callee.name.text);
  }
  return false;
}

/*
 * Local helpers that forward a URL parameter to a caller, e.g.
 *   async function getJson(path) { return fetch(patientApiUrl(path), ...) }
 * become callers themselves (name -> index of the URL parameter, method used inside).
 * Collected over every source file of both apps before the routes are analysed.
 */
const WRAPPERS = new Map();
// Query builders: functions that return an API path, e.g. doctorQuery(input) -> `/care/doctors?...`
const BUILDERS = new Map();
// Request builders: functions that return the request itself, as `{ path, body }` (offer-selection) or
// `[url, init]` (reminderLogRequest). Callers do `fetch(request.path, ...)` / `fetch(...builder(...))`.
// name -> [{ path, head, method? }]
const REQ_BUILDERS = new Map();
const PARSED = []; // every parsed source file (collectWrappers), reused by the wrapper-caller census
// index of the function parameter a URL expression is made of (`path`, `patientApiUrl(path)`, `path as string`), or -1
function paramOf(arg, params) {
  for (let a = arg, i = 0; a && i < 4; i++) {
    if (ts.isIdentifier(a)) return params.indexOf(a.text);
    if (ts.isCallExpression(a) && a.arguments.length) a = a.arguments[0];
    else if (ts.isAsExpression(a) || ts.isParenthesizedExpression(a)) a = a.expression;
    else return -1;
  }
  return -1;
}
const SOURCE_DIRS = ['patient-app/app', 'patient-app/src', 'patient-app/utils', 'patient-web/app', 'patient-web/components-next', 'patient-web/lib'];

function collectWrappers(dirs = SOURCE_DIRS) {
  const files = dirs.flatMap((d) => walk(join(REPO, d), (p) => /\.(tsx?|jsx?)$/.test(p) && !/\.(test|spec|d)\.tsx?$/.test(p)));
  const parsed = files.map((f) => ts.createSourceFile(f, read(f), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
  PARSED.push(...parsed);
  for (const sf of parsed) {
    const visitB = (name, fn) => {
      if (!name || !fn.body) return;
      const rets = [];
      if (!ts.isBlock(fn.body)) rets.push(fn.body);
      else {
        const v = (n) => {
          if (ts.isFunctionLike(n) && n !== fn) return;
          if (ts.isReturnStatement(n) && n.expression) rets.push(n.expression);
          ts.forEachChild(n, v);
        };
        ts.forEachChild(fn.body, v);
      }
      if (rets.some((r) => ts.isCallExpression(r) || ts.isAwaitExpression(r))) return; // returns a call result, not a path
      const paths = rets.flatMap((r) => literalPaths(r, sf)).filter((x) => !x.head && /^\/[a-z]/.test(x.path) && !x.path.startsWith('/api/'));
      if (paths.length && paths.length === rets.length) BUILDERS.set(name, paths);
    };
    const visitR = (name, fn) => {
      if (!name || !fn.body) return;
      const rets = [];
      if (!ts.isBlock(fn.body)) rets.push(fn.body);
      else {
        const v = (n) => {
          if (ts.isFunctionLike(n) && n !== fn) return;
          if (ts.isReturnStatement(n) && n.expression) rets.push(n.expression);
          ts.forEachChild(n, v);
        };
        ts.forEachChild(fn.body, v);
      }
      const flat = [];
      const spread = (r) => {
        if (ts.isParenthesizedExpression(r) || ts.isAsExpression(r) || ts.isNonNullExpression(r)) return spread(r.expression);
        if (ts.isConditionalExpression(r)) return (spread(r.whenTrue), spread(r.whenFalse));
        flat.push(r);
      };
      rets.forEach(spread);
      const out = [];
      for (const r of flat) {
        if (r.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(r) && r.text === 'undefined')) continue;
        let url = null;
        let opts = null;
        if (ts.isObjectLiteralExpression(r)) {
          const p = r.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText(sf) === 'path');
          url = p ? p.initializer : null;
        } else if (ts.isArrayLiteralExpression(r) && r.elements.length >= 1) {
          url = r.elements[0];
          opts = r.elements[1];
        }
        const lps = url ? literalPaths(url, sf).filter((x) => !x.head && /^\/[a-z]/.test(x.path)) : [];
        if (!lps.length) return; // some return is not a request: not a builder
        let method;
        if (opts && ts.isObjectLiteralExpression(opts)) {
          const m = opts.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText(sf) === 'method');
          if (m && ts.isStringLiteral(m.initializer)) method = m.initializer.text.toUpperCase();
        }
        for (const lp of lps) out.push({ ...lp, method });
      }
      if (out.length) REQ_BUILDERS.set(name, out);
    };
    const top = (n) => {
      if (ts.isFunctionDeclaration(n) && n.name) (visitB(n.name.text, n), visitR(n.name.text, n));
      else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) (visitB(n.name.text, n.initializer), visitR(n.name.text, n.initializer));
      ts.forEachChild(n, top);
    };
    top(sf);
  }
  for (let round = 0; round < 3; round++) {
    const before = WRAPPERS.size;
    for (const sf of parsed) {
      const visitFn = (name, fn) => {
        if (!name || name.length < 5 || CALLER_FUNCS.has(name) || WRAPPERS.has(name) || !fn.body) return;
        const params = fn.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : ''));
        let found = null;
        const v = (n) => {
          if (found) return;
          if (ts.isCallExpression(n) && n.arguments.length) {
            const callee = n.expression;
            const w = ts.isIdentifier(callee) ? WRAPPERS.get(callee.text) : null;
            const ok = isCallerCallee(callee, sf) || w;
            const urlArg = w ? n.arguments[w.arg] : n.arguments[0];
            const idx = ok && urlArg && !literalPaths(urlArg, sf).length ? paramOf(urlArg, params) : -1;
            if (idx >= 0) {
              const m = w ? w.method : methodOf(callee, n.arguments);
              found = { arg: idx, method: m };
            }
          }
          ts.forEachChild(n, v);
        };
        v(fn.body);
        if (found) WRAPPERS.set(name, found);
      };
      const top = (n) => {
        if (ts.isFunctionDeclaration(n) && n.name) visitFn(n.name.text, n);
        else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) visitFn(n.name.text, n.initializer);
        ts.forEachChild(n, top);
      };
      top(sf);
    }
    if (WRAPPERS.size === before) break;
  }
}

// The URL argument of a call -> [{ path, head }] (head = text of a leading `${base}` hole).
// Follows ternaries, `+` concatenation, wrapper calls (`patientApiUrl("/x")`, `servicePath("/x")`)
// and identifiers bound to a const in an enclosing scope.
function literalPaths(node, sf, depth = 0) {
  if (!node || depth > 6) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [{ path: node.text, head: '' }];
  if (ts.isTemplateExpression(node)) {
    // Each hole becomes `:param`, except a hole glued to the previous hole or to text that does not end
    // a segment (`${id}${suffix}`, `/api/patient${path}`): that is a variable path suffix -> `:suffix`.
    // A glued hole that looks like a query (`/care/doctors${query ? `?${query}` : ""}`) stays `:param`
    // and normalisePath drops it.
    const hole = (sp, i) => {
      const prev = i === 0 ? node.head.text : node.templateSpans[i - 1].literal.text;
      const glued = (i > 0 && prev === '') || (prev !== '' && !/[/=?&]$/.test(prev) && !prev.includes('?'));
      const queryLike = /\?|query|search|params|qs\b/i.test(sp.expression.getText(sf));
      return glued && !queryLike ? ':suffix' : ':param';
    };
    if (node.head.text === '' && node.templateSpans.length) {
      const first = node.templateSpans[0].expression;
      const rest = node.templateSpans.map((sp, i) => (i === 0 ? '' : hole(sp, i)) + sp.literal.text).join('');
      // `${base}/x` where base is a local const path -> resolve it
      const init = ts.isIdentifier(first) ? constInit(first) : null;
      const pre = init ? literalPaths(init, sf, depth + 1).filter((x) => x.path.startsWith('/')) : [];
      if (pre.length) return pre.map((x) => ({ path: x.path + rest, head: x.head }));
      return [{ path: rest, head: first.getText(sf) }];
    }
    return [{ path: node.head.text + node.templateSpans.map((sp, i) => hole(sp, i) + sp.literal.text).join(''), head: '' }];
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = literalPaths(node.left, sf, depth + 1);
    if (l.length) return l.map((x) => ({ path: x.path + ':param', head: x.head }));
    if (ts.isIdentifier(node.left)) return literalPaths(node.right, sf, depth + 1).map((x) => ({ path: x.path, head: node.left.text }));
    return [];
  }
  if (ts.isConditionalExpression(node)) return [...literalPaths(node.whenTrue, sf, depth + 1), ...literalPaths(node.whenFalse, sf, depth + 1)];
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node)) return literalPaths(node.expression, sf, depth + 1);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && BUILDERS.has(node.expression.text)) return BUILDERS.get(node.expression.text);
  // `fetch(...reminderLogRequest(id))`: spread of a request builder that returns `[url, init]`
  if (ts.isSpreadElement(node)) return literalPaths(node.expression, sf, depth + 1);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && REQ_BUILDERS.has(node.expression.text)) return REQ_BUILDERS.get(node.expression.text).map((x) => ({ ...x, fromBuilder: true }));
  // `fetch(request.path, ...)` where `const request = buildXRequest(...)` (or a ternary of builders)
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'path' && ts.isIdentifier(node.expression)) {
    const init = constInit(node.expression);
    return init ? literalPaths(init, sf, depth + 1).filter((x) => x.fromBuilder) : [];
  }
  if (ts.isCallExpression(node) && node.arguments.length && ts.isIdentifier(node.expression) && !/^(encodeURI|encodeURIComponent|String)$/.test(node.expression.text)) {
    return literalPaths(node.arguments[0], sf, depth + 1);
  }
  if (ts.isIdentifier(node)) {
    const init = constInit(node);
    return init ? literalPaths(init, sf, depth + 1) : [];
  }
  return [];
}

// initializer of `const <name> = ...` in the nearest enclosing block / source file
function constInit(id) {
  for (let p = id.parent; p; p = p.parent) {
    const stmts = ts.isBlock(p) || ts.isSourceFile(p) || ts.isModuleBlock(p) ? p.statements : null;
    if (!stmts) continue;
    for (const st of stmts) {
      if (!ts.isVariableStatement(st) || !(st.declarationList.flags & ts.NodeFlags.Const)) continue;
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === id.text && d.initializer) return d.initializer;
    }
  }
  return null;
}

function methodOf(callee, args) {
  if (ts.isPropertyAccessExpression(callee) && VERBS.has(callee.name.text)) return callee.name.text.toUpperCase();
  const opt = args[1];
  if (!opt) return 'GET';
  if (ts.isObjectLiteralExpression(opt)) {
    for (const p of opt.properties) {
      if (ts.isPropertyAssignment(p) && p.name && p.name.getText() === 'method') {
        const v = p.initializer;
        if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) return v.text.toUpperCase();
        return '*';
      }
      if (ts.isSpreadAssignment(p)) return '*';
    }
    return 'GET';
  }
  return '*';
}

function normalisePath(p, head) {
  let path = p.split('?')[0].split('#')[0];
  // a variable suffix makes the rest of the path unknown: keep the known prefix, mark it partial
  const partial = path.includes(':suffix');
  if (partial) path = path.slice(0, path.indexOf(':suffix'));
  let target = 'backend';
  if (/AI_URL|FASTAPI|fastapi/i.test(head)) target = 'ai-service';
  path = path.replace(/^https?:\/\/[^/]+/, '');
  if (!path.startsWith('/')) return null;
  if (path.startsWith('/api/v1/')) path = path.slice(7);
  else if (path.startsWith('/api/patient/')) target = target === 'backend' && !head ? 'web-proxy' : target;
  else if (path.startsWith('/api/') && !head) target = 'web-bff';
  else if (path.startsWith('/api/') && head) path = path.slice(4);
  // a hole that starts a segment is a path param; one glued to text (`/care/doctors${query}`) is a suffix
  path = path
    .split('/')
    .map((seg) => (seg.startsWith(':param') ? ':param' : seg.includes(':param') ? seg.split(':param')[0] : seg))
    .join('/')
    .replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/:param') return null;
  const q = p.includes('?') ? p.slice(p.indexOf('?')) : '';
  return partial ? { path: path + '/…', target, query: q, partial: true } : { path, target, query: q };
}

const fileCache = new Map();
// generic wrappers (call sites that forward a parameter), unresolved sites, and hand-written resolutions
const WRAPPER_SITES = new Map();
const UNRESOLVED_SITES = new Map();
const MANUAL = new Map(); // "file:line" -> { method, path, note }  (docs/design/inventory/manual-calls.json)
const MANUAL_USED = new Set();

function analyseFile(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = new Map(); // local -> {spec, name}
  const decls = new Map(); // local name -> [nodes]
  const exportsMap = new Map(); // exported name -> {local} | {spec, name}
  const stars = []; // spec
  const loose = []; // top-level statements that are not declarations

  const addDecl = (name, node) => {
    if (!decls.has(name)) decls.set(name, []);
    decls.get(name).push(node);
  };
  const isExported = (n) => (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Export) !== 0;
  const isDefault = (n) => (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Default) !== 0;

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      if (st.importClause?.isTypeOnly) continue;
      const spec = st.moduleSpecifier.text;
      const c = st.importClause;
      if (!c) continue;
      if (c.name) imports.set(c.name.text, { spec, name: 'default' });
      if (c.namedBindings) {
        if (ts.isNamespaceImport(c.namedBindings)) imports.set(c.namedBindings.name.text, { spec, name: '*' });
        else for (const el of c.namedBindings.elements) if (!el.isTypeOnly) imports.set(el.name.text, { spec, name: (el.propertyName || el.name).text });
      }
    } else if (ts.isExportDeclaration(st)) {
      if (st.isTypeOnly) continue;
      const spec = st.moduleSpecifier?.text;
      if (!st.exportClause) {
        if (spec) stars.push(spec);
      } else if (ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) {
          const from = (el.propertyName || el.name).text;
          if (spec) exportsMap.set(el.name.text, { spec, name: from });
          else exportsMap.set(el.name.text, { local: from });
        }
      } else if (spec) exportsMap.set(st.exportClause.name.text, { spec, name: '*' });
    } else if (ts.isExportAssignment(st)) {
      addDecl('default', st.expression);
      exportsMap.set('default', { local: 'default' });
    } else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) {
      const name = st.name ? st.name.text : 'default';
      addDecl(name, st);
      if (isExported(st)) exportsMap.set(isDefault(st) ? 'default' : name, { local: name });
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const names = [];
        const collect = (b) => {
          if (ts.isIdentifier(b)) names.push(b.text);
          else for (const e of b.elements || []) if (!ts.isOmittedExpression(e)) collect(e.name);
        };
        collect(d.name);
        for (const n of names) {
          addDecl(n, d);
          if (isExported(st)) exportsMap.set(n, { local: n });
        }
      }
    } else if (ts.isEnumDeclaration(st) || ts.isModuleDeclaration(st)) {
      // no runtime calls of interest
    } else if (!ts.isInterfaceDeclaration(st) && !ts.isTypeAliasDeclaration(st)) loose.push(st);
  }

  const topNames = new Set([...decls.keys(), ...imports.keys()]);
  const info = new Map(); // decl name -> {calls:[], refs:Set}
  let unresolved = 0;

  const scan = (node) => {
    const calls = [];
    const refs = new Set();
    const visit = (n) => {
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        const callee = n.expression;
        const args = n.arguments || [];
        const isCaller = isCallerCallee(callee, sf);
        const wrapper = !isCaller && ts.isIdentifier(callee) ? WRAPPERS.get(callee.text) : null;
        let urlArg = wrapper ? args[wrapper.arg] : args[0];
        // `HttpClient.request({ url, method, ... })`: the URL is the `url` property of an options object
        let optsArg = wrapper ? args[wrapper.arg + 1] : args[1];
        if (isCaller && urlArg && ts.isObjectLiteralExpression(urlArg)) {
          optsArg = urlArg;
          const u = urlArg.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText(sf) === 'url');
          urlArg = u ? u.initializer : null;
        }
        if ((isCaller || wrapper) && urlArg) {
          const method = wrapper
            ? wrapper.method !== '*' ? wrapper.method : args[wrapper.arg + 1] && ts.isObjectLiteralExpression(args[wrapper.arg + 1]) ? methodOf(callee, [urlArg, args[wrapper.arg + 1]]) : 'GET'
            : methodOf(callee, [urlArg, optsArg]);
          const lps = literalPaths(urlArg, sf);
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          if (!lps.length) {
            // A generic wrapper (`function callPatientApi(path) { return fetch(patientApiUrl(path)) }`) forwards its own
            // parameter: the paths are attributed at its callers, so this is not an unresolved call.
            const fnParams = [];
            for (let a = n.parent; a; a = a.parent) {
              if (ts.isFunctionLike(a)) fnParams.push({ fn: a, params: a.parameters.map((x) => (ts.isIdentifier(x.name) ? x.name.text : '')) });
            }
            const owner = fnParams.find((f) => paramOf(urlArg, f.params) >= 0);
            // `HttpClient(config)` inside an axios interceptor re-sends the request that just failed: that request is
            // already counted at its own call site, so the replay adds no endpoint.
            const replay = ts.isIdentifier(callee) && callee.text === 'HttpClient' && ts.isIdentifier(urlArg);
            const manual = MANUAL.get(rel(file) + ':' + line);
            if (replay) {
              WRAPPER_SITES.set(rel(file) + ':' + line, { file: rel(file), line, fn: '(axios interceptor)', call: n.getText(sf).slice(0, 60), replay: true });
            } else if (owner) {
              const fnName = owner.fn.name?.text || (ts.isVariableDeclaration(owner.fn.parent) ? owner.fn.parent.name.getText(sf) : '(anonymous)');
              WRAPPER_SITES.set(rel(file) + ':' + line, { file: rel(file), line, fn: fnName, call: n.getText(sf).slice(0, 60).replace(/\s+/g, ' ') });
            } else if (manual) {
              MANUAL_USED.add(rel(file) + ':' + line);
              const np = normalisePath(manual.path, '');
              if (np) calls.push({ method: manual.method, ...np, line, file: rel(file), via: 'manual-calls.json', note: manual.note });
            } else {
              unresolved++;
              UNRESOLVED_SITES.set(rel(file) + ':' + line, { file: rel(file), line, call: n.getText(sf).slice(0, 90).replace(/\s+/g, ' ') });
              if (process.env.DEBUG_UNRESOLVED) console.error('UNRESOLVED', rel(file) + ':' + line, n.getText(sf).slice(0, 90).replace(/\s+/g, ' '));
            }
          }
          for (const lp of lps) {
            const np = normalisePath(lp.path, lp.head);
            // `fetch(...builder())` takes its method from the builder's `init`
            if (np) calls.push({ method: ts.isSpreadElement(urlArg) && lp.method ? lp.method : method, ...np, line, file: rel(file), ...(lp.fromBuilder ? { via: 'request builder' } : {}) });
          }
        }
      }
      if (ts.isIdentifier(n) && topNames.has(n.text)) {
        const p = n.parent;
        const isPropName = p && ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n));
        if (!isPropName) refs.add(n.text);
      }
      if (ts.isShorthandPropertyAssignment(n) && topNames.has(n.name.text)) refs.add(n.name.text);
      ts.forEachChild(n, visit);
    };
    visit(node);
    return { calls, refs };
  };

  for (const [name, nodes] of decls) {
    const calls = [];
    const refs = new Set();
    for (const nd of nodes) {
      const r = scan(nd);
      calls.push(...r.calls);
      r.refs.forEach((x) => x !== name && refs.add(x));
    }
    info.set(name, { calls, refs });
  }
  const looseScan = { calls: [], refs: new Set() };
  for (const st of loose) {
    const r = scan(st);
    looseScan.calls.push(...r.calls);
    r.refs.forEach((x) => looseScan.refs.add(x));
  }

  const res = { file, imports, decls, exportsMap, stars, info, loose: looseScan, unresolved };
  fileCache.set(file, res);
  return res;
}

/* ------------------------------------------------- symbol-level closure */

function closure(appKey, entryFile, entrySym = '**') {
  const calls = [];
  const seen = new Set();
  const files = new Set();
  let unresolved = 0;

  const want = (file, sym) => {
    const key = file + '#' + sym;
    if (seen.has(key)) return;
    seen.add(key);
    let fa;
    try {
      fa = analyseFile(file);
    } catch {
      return;
    }
    if (!files.has(file)) {
      files.add(file);
      unresolved += fa.unresolved;
      calls.push(...fa.loose.calls);
      for (const r of fa.loose.refs) local(fa, r);
    }
    if (sym === '*') {
      for (const name of fa.exportsMap.keys()) exported(fa, name);
      for (const s of fa.stars) {
        const t = resolveSpec(appKey, file, s);
        if (t) want(t, '*');
      }
      return;
    }
    if (sym === '**') {
      // a route file: everything it declares or re-exports
      for (const name of fa.decls.keys()) local(fa, name);
      for (const name of fa.exportsMap.keys()) exported(fa, name);
      return;
    }
    exported(fa, sym);
  };

  const exported = (fa, name) => {
    const e = fa.exportsMap.get(name);
    if (e && 'local' in e) return local(fa, e.local);
    if (e && e.spec) {
      const t = resolveSpec(appKey, fa.file, e.spec);
      if (t) want(t, e.name);
      return;
    }
    if (fa.decls.has(name)) return local(fa, name);
    for (const s of fa.stars) {
      const t = resolveSpec(appKey, fa.file, s);
      if (t) want(t, name);
    }
  };

  const localSeen = new Set();
  const local = (fa, name) => {
    const key = fa.file + '::' + name;
    if (localSeen.has(key)) return;
    localSeen.add(key);
    const imp = fa.imports.get(name);
    if (imp) {
      const t = resolveSpec(appKey, fa.file, imp.spec);
      if (t) want(t, imp.name);
      return;
    }
    const inf = fa.info.get(name);
    if (!inf) return;
    calls.push(...inf.calls);
    for (const r of inf.refs) local(fa, r);
  };

  want(entryFile, entrySym);
  const uniq = new Map();
  for (const c of calls) {
    const k = `${c.method} ${c.target} ${c.path}`;
    if (!uniq.has(k)) uniq.set(k, c);
  }
  return { calls: [...uniq.values()], files: files.size, unresolved, fileSet: files };
}

/* ------------------------------------------- wrapper callers and resolved sites */

// For every generic wrapper (a function that forwards its own parameter to fetch), count the call sites
// of that function: each must resolve to a path itself (or be another forwarding wrapper), otherwise it
// is listed. This is the proof that "wrapper, not unresolved" does not hide a call.
function wrapperCensus() {
  const sites = [...WRAPPER_SITES.values()].filter((x) => !x.replay);
  const fns = new Map(); // "file#fn" -> { file, fn, line, arg }
  for (const x of sites) fns.set(x.file + '#' + x.fn, { ...x, arg: WRAPPERS.get(x.fn)?.arg ?? 0 });
  const out = [];
  for (const w of fns.values()) {
    const appKey = w.file.startsWith('patient-web') ? 'patient-web' : 'patient-app';
    let callers = 0;
    let resolved = 0;
    let forwarding = 0;
    const other = [];
    for (const sf of PARSED) {
      const f = rel(sf.fileName);
      if (f.startsWith('patient-web') !== (appKey === 'patient-web')) continue;
      // does this file see the wrapper? same file, or an import of that name
      let sees = f === w.file;
      if (!sees) for (const v of analyseFile(sf.fileName).imports.values()) if (v.name === w.fn) sees = true;
      if (!sees) continue;
      const v = (n) => {
        if (ts.isCallExpression(n)) {
          const c = n.expression;
          const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : '';
          const a = n.arguments[w.arg];
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          if (name === w.fn && a && !(f === w.file && line === w.line)) {
            callers++;
            if (literalPaths(a, sf).length) resolved++;
            else {
              const owners = [];
              for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) owners.push(p.parameters.map((x) => (ts.isIdentifier(x.name) ? x.name.text : '')));
              if (owners.some((ps) => paramOf(a, ps) >= 0)) forwarding++;
              else other.push(`${f}:${line}`);
            }
          }
        }
        ts.forEachChild(n, v);
      };
      v(sf);
    }
    out.push({ file: w.file, line: w.line, fn: w.fn, callers, resolved, forwarding, other: other.sort() });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/* ------------------------------------------------------ backend matching */

function backendRoutes() {
  const out = join(tmpdir(), `nabd-routes-${process.pid}.json`);
  const r = spawnSync('python3', ['tools/audit/routes.py', out], { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('tools/audit/routes.py failed', r.stderr);
    process.exit(2);
  }
  return JSON.parse(read(out)).map((x) => ({ m: x.m, p: x.p, segs: x.p.split('/').filter(Boolean), src: `${rel(join(REPO, x.f))}:${x.l}` }));
}

function matchRoute(routes, method, path) {
  const segs = path.split('/').filter(Boolean);
  const hits = routes.filter((r) => {
    if (r.segs.length !== segs.length) return false;
    return r.segs.every((b, i) => b.startsWith(':') || b === '*' || segs[i] === ':param' || segs[i] === b);
  });
  if (!hits.length) return { status: 'NO_ROUTE' };
  // prefer exact literal matches
  const score = (r) => r.segs.reduce((s, b, i) => s + (b === segs[i] ? 2 : segs[i] === ':param' && !b.startsWith(':') ? 0 : 1), 0);
  hits.sort((a, b) => score(b) - score(a));
  const ok = hits.find((r) => method === '*' || r.m === method || r.m === 'ALL');
  if (ok) return { status: 'OK', route: ok };
  return { status: 'WRONG_METHOD', route: hits[0], methods: [...new Set(hits.map((h) => h.m))] };
}

function webBffHandlers() {
  const dir = join(REPO, 'patient-web/app/api');
  return walk(dir, (p) => p.endsWith(`${sep}route.ts`)).map((file) => {
    const segs = relative(join(REPO, 'patient-web/app'), dirname(file)).split(sep);
    const methods = [...read(file).matchAll(/export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    const reexp = [...read(file).matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop()));
    for (const m of reexp) if (/^(GET|POST|PUT|PATCH|DELETE)$/.test(m)) methods.push(m);
    return { file, segs, methods };
  });
}

function matchBff(handlers, method, path) {
  const segs = path.split('/').filter(Boolean);
  const fits = (h) => {
    for (let i = 0; i < h.segs.length; i++) {
      const b = h.segs[i];
      if (/^\[\[?\.\.\./.test(b)) return segs.length > i || b.startsWith('[[');
      if (i >= segs.length) return false;
      if (/^\[.+\]$/.test(b) || segs[i] === ':param') continue;
      if (b !== segs[i]) return false;
    }
    return h.segs.length === segs.length;
  };
  // Next prefers static segments over dynamic ones over catch-alls
  const rank = (h) => h.segs.reduce((s, b) => s + (b.startsWith('[...') || b.startsWith('[[...') ? 0 : b.startsWith('[') ? 1 : 2), 0);
  const hits = handlers.filter(fits).sort((a, b) => rank(b) - rank(a));
  if (!hits.length) return { status: 'NO_HANDLER' };
  const h = hits[0];
  if (method === '*' || h.methods.includes(method)) return { status: 'OK', handler: h };
  return { status: 'WRONG_METHOD', handler: h };
}

async function loadAllowlist() {
  const file = join(REPO, 'patient-web/lib/api/patient-allowlist.ts');
  if (!existsSync(file)) return null;
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  return mod.isAllowedPatientApiTarget || null;
}

const SAMPLE_ID = '3f2b8c1e-4a5d-4e6f-8a7b-9c0d1e2f3a4b';

const literalCache = new Map();
function fileLiterals(file) {
  if (!literalCache.has(file)) {
    const set = new Set();
    try {
      const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const v = (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /^[A-Za-z0-9_-]{2,40}$/.test(n.text)) set.add(n.text);
        ts.forEachChild(n, v);
      };
      v(sf);
    } catch {
      /* unreadable file: no extra samples */
    }
    literalCache.set(file, [...set]);
  }
  return literalCache.get(file);
}

/* ------------------------------------------------------------ redirects */

// A route file that only forwards elsewhere (Next `redirect()` with no JSX, expo-router `<Redirect>`,
// or `router.replace()` behind a spinner). Returns the target path, or null.
function redirectTarget(file) {
  const src = read(file);
  if (src.split('\n').length > 80) return null;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let jsx = 0;
  let target = null;
  let viaReplace = false;
  const v = (n) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      jsx++;
      const tag = ts.isJsxElement(n) ? n.openingElement.tagName.getText(sf) : n.tagName.getText(sf);
      if (tag === 'Redirect') {
        const href = (ts.isJsxElement(n) ? n.openingElement : n).attributes.properties.find((a) => a.name?.getText(sf) === 'href');
        const init = href?.initializer;
        const e = init && ts.isJsxExpression(init) ? init.expression : init;
        target = (e && literalPaths(e, sf)[0]?.path) || '?';
      }
    }
    if (ts.isCallExpression(n)) {
      const c = n.expression.getText(sf);
      if (/^(redirect|permanentRedirect)$/.test(c) && n.arguments.length && !target) target = literalPaths(n.arguments[0], sf)[0]?.path || '?';
      if (/^router\.replace$/.test(c) && n.arguments.length && !target) {
        const a = n.arguments[0];
        const pn = ts.isObjectLiteralExpression(a) ? a.properties.find((x) => x.name?.getText(sf) === 'pathname')?.initializer : a;
        target = (pn && literalPaths(pn, sf)[0]?.path) || '?';
        viaReplace = true;
      }
    }
    ts.forEachChild(n, v);
  };
  v(sf);
  if (!target) return null;
  if (viaReplace && jsx > 4) return null; // a real screen that navigates away on some condition
  if (!viaReplace && jsx > 0 && !/<Redirect\b/.test(src)) return null;
  return target.replace(/:param/g, '…').replace(/^\/…(?=\/)/, '');
}

/* --------------------------------------------------------- classification */

const TEMPLATES = ['hub', 'list', 'detail', 'form', 'flow step', 'tracking', 'result', 'settings', 'state', 'redirect'];

function template(route) {
  const r = route.toLowerCase();
  const last = r.split('/').filter(Boolean).pop() || '';
  const t = (re) => re.test(r);
  if (t(/not-found|drug-not-found|\/offline|\/error/)) return 'state';
  if (t(/^\/(welcome|onboarding)$/)) return 'flow step';
  if (t(/^\/ai\/(triage|symptom|skin|prescription-translator|chat)/) || t(/^\/ai-assistant$/)) return 'flow step';
  if (/^\[\[?\.\.\./.test(last)) return 'list';
  if (t(/^\/(doctors|labs|radiology|pharmacies|home-nursing|services)\/\[[^/]+\](\/|$)/)) return 'list'; // city / specialty landing pages
  if (t(/(success|failed|\/result$|booking-status|approval-pending|booking-pending|summary$)/)) return 'result';
  if (t(/(tracking|broadcast-status|waiting-for-pharmacy|waiting-room|sos-active|\/processing$|insurance-approval|insurance-status)/)) return 'tracking';
  if (t(/^\/settings|\/settings$|\/language$|notifications-settings|\/security$|\/permissions$|\/privacy$|\/data$/) && !t(/^\/privacy$/)) return 'settings';
  if (t(/(\/login|\/register|\/otp|forgot-password|reset-password|password-reset|\/add|\/edit|add-|-add$|\/invite|\/join|setup|\/log$|log-meal|\/feedback|\/ticket|new-request|custom-item|manual-order|\/request$|follow-up|cancel-reschedule|post-call-rating|submit-claim|self-assessment|\/reviews$|vitals\/log|reminders\/add)/)) return 'form';
  if (t(/(checkout|payment|\/cart|\/book\/|\/book$|book-sample|select|final-quote|insurance-decision|copay|payment-split|rx-order|scan|scanner|barcode|location-picker|clinic-location|confirm|upload|video-call|incoming-call|\/room\/|\/voice$|\/chat|chat-|-chat$|\/sos$|negotiation)/)) return 'flow step';
  if (/^\[.+\]$/.test(last) || t(/(detail|profile|\/p\/|\/s\/|-id$|passport|\/score$|sleep-score|\/package-detail|\/test-detail)/)) return 'detail';
  if (t(/(^\/$|^\/dashboard$|hub$|^\/services$|^\/[a-z-]+$)/) && !t(/^\/(orders|appointments|notifications|search|articles|offers|reviews|prescriptions|reports|wishlist|medicines|doctors|pharmacies|labs|radiology|returns|programs|reminders|chat|map|terms|privacy|provider-info|welcome|onboarding|emergency|drug-scanner|medicine|medicine-catalog|doctor|s|p|support)$/)) return 'hub';
  if (t(/^\/(terms|privacy|provider-info|welcome|onboarding)$|\/terms$|\/about$|\/help$/)) return 'detail';
  return 'list';
}

const BOARD_RULES = [
  // [regex on route, mobile board, web board (null = same)]
  [/\/(welcome|onboarding)(\/|$)/, 'Welcome', 'AuthWeb'],
  [/\/(login|forgot-password|reset-password|password-reset)$/, 'Login', 'AuthWeb'],
  [/\/otp$/, 'Otp', 'AuthWeb'],
  [/\/register$/, 'Register', 'AuthWeb'],
  [/^\/$|^\/dashboard$/, 'HomeApp', 'HomeWeb'],
  [/^\/search$|^\/s$|\/product-search$/, 'Search', 'SearchWeb'],
  [/(drug-not-found|not-found|\/payments\/failed$)/, 'States', null],
  [/^\/notifications\/settings$|^\/settings|\/notifications-settings$|\/language$/, 'Settings', null],
  [/^\/notifications$/, 'Notifications', null],
  [/(\/cart\/prescription|rx-order|scan-prescription|upload-rx|insurance-upload)/, 'RxUpload', null],
  [/(broadcast-status|waiting-for-pharmacy|\/offers$|\/offers\/negotiation|\/final-quote$)/, 'PharmacyOffers', null, /^\/(orders|pharmacy)/],
  [/(tracking|sos-active)/, 'OrderTracking', null],
  [/(\/cart$|^\/diagnostics\/cart$|^\/pharmacy\/cart$)/, 'Cart', null],
  [/(checkout|\/payment$|^\/payments|copay|payment-split|insurance-decision)/, 'CheckoutV2', null],
  [/(confirm|booking-success|booking-status|booking-pending|\/book\/|\/book$|labs\/book|book-sample)/, 'BookingConfirm', null],
  [/^\/(delivery\/address-select|profile\/addresses)$/, 'Account', null],
  [/location-picker|clinic-location/, 'none: map', null],
  [/^\/(medicine|medicines|p)\/\[|product-detail/, 'ProductFull', 'ProductWeb'],
  [/^\/(orders|returns)|order-history|\/orders$|\/bookings$|\/visits$|\/reorder$/, 'Orders', null],
  [/(appointments|call-history)/, 'Appointments', null],
  [/^\/(doctor|facility)\/|doctor-profile|consultations\/doctor\/|doctors\/\[doctorId\]|nurse-profile|nurses\/\[|clinic\/\[|clinics\/\[/, 'DoctorFull', null],
  [/^\/(pharmacy|pharmacies|medicine|medicines|medicine-catalog|c|wishlist|delivery)(\/|$)|^\/pharmacy$/, 'PharmacyHub', null],
  [/^\/(consultations|doctors|doctor)(\/|$)/, 'Consult', null],
  [/^\/(diagnostics|labs|radiology|nursing|home-care|home-nursing|services)(\/|$)/, 'ServiceHub', null],
  [/^\/family|family-|add-family-member/, 'Family', null],
  [/^\/insurance|^\/profile\/insurance/, 'Insurance', null],
  [/^\/(maternity|nutrition|mental-health|programs)(\/|$)|chronic/, 'CareHub', null],
  [/^\/(health|reports|reminders|wearables|prescriptions)(\/|$)/, 'HealthHub', null],
  [/^\/(articles|community|condition)(\/|$)/, 'CareHub', null],
  [/^\/(profile|loyalty|support|reviews)(\/|$)/, 'Account', null],
  [/^\/offers(\/|$)/, 'HomeApp', 'HomeWeb'],
  [/^\/(ai|ai-assistant|voice|drug-scanner)(\/|$)/, 'CareHub', null],
  [/^\/(terms|privacy|provider-info)$/, 'Settings', null],
];
const NO_BOARD = [
  [/(\/chat|chat-|-chat$|support\/chat|pharmacist-chat)/, 'none: chat'],
  [/(video-call|incoming-call|\/room\/|waiting-room|virtual-waiting-room)/, 'none: call'],
  [/^\/emergency/, 'none: emergency'],
  [/^\/map/, 'none: map'],
];

function board(app, route) {
  for (const [re, label] of NO_BOARD) if (re.test(route)) return label;
  for (const [re, mob, web, guard] of BOARD_RULES) {
    if (guard && !guard.test(route)) continue;
    if (re.test(route)) return app === 'patient-web' && web ? web : mob;
  }
  return 'none';
}

const BATCHES = [
  [0, 'core (boards exist)', /^\/$|^\/dashboard$|^\/services$|^\/(welcome|onboarding|login|register|otp|forgot-password|reset-password|password-reset|search|notifications)(\/|$)/],
  [13, 'web-only / public pages', /^\/(doctors\/\[specialty\]|labs\/\[testSlug\]|radiology\/\[serviceSlug\]|home-nursing\/\[citySlug\]|services\/\[serviceSlug\]|doctor\/\[slug\]\/\[city\]|pharmacies|medicine-catalog|condition|terms|privacy|provider-info|facility|s)(\/|$)/],
  [1, 'pharmacy flows', /^\/(pharmacy|medicine|medicines|cart|orders|delivery|wishlist|payments|prescriptions|p|c)(\/|$)/],
  [2, 'consultations and video', /^\/(consultations|doctor|doctors|appointments|room|chat)(\/|$)/],
  [3, 'labs and radiology', /^\/(diagnostics|labs|radiology)(\/|$)/],
  [4, 'nursing / home care', /^\/(nursing|home-care|home-nursing)(\/|$)/],
  [8, 'maternity, nutrition, mental health, chronic care', /^\/(maternity|nutrition|mental-health|programs)(\/|$)|^\/health\/chronic/],
  [6, 'family', /^\/family(\/|$)|^\/health\/(family|add-family-member)/],
  [5, 'health records and reports', /^\/(health|reports|reminders|wearables|emergency)(\/|$)/],
  [7, 'insurance', /^\/insurance(\/|$)|^\/profile\/insurance/],
  [9, 'AI tools', /^\/(ai|ai-assistant|voice|drug-scanner)(\/|$)/],
  [10, 'community and articles', /^\/(community|articles)(\/|$)/],
  [11, 'loyalty and offers', /^\/(loyalty|offers)(\/|$)/],
  [12, 'account, settings, support, returns', /^\/(profile|settings|support|returns|reviews|shared|map)(\/|$)/],
];

function batch(route) {
  for (const [n, , re] of BATCHES) if (re.test(route)) return n;
  return 12;
}

/* ------------------------------------------------- design foundation */

function foundation() {
  const rows = [];
  const has = (p) => existsSync(join(REPO, p));
  // `code: true` matches code only, as the lint gates do: comments blanked, test files skipped
  // (a comment may say "never 100vh", and a test asserts its absence).
  const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const grepRepo = (dirs, re, exts = /\.(tsx?|jsx?|css|json)$/, { code = false } = {}) => {
    const hits = [];
    for (const d of dirs)
      for (const f of walk(join(REPO, d), (p) => exts.test(p) && !(code && /\.(test|spec)\.[jt]sx?$/.test(p))))
        if (re.test(code ? stripComments(read(f)) : read(f))) hits.push(rel(f));
    return hits;
  };
  const tokens = has('packages/design-tokens/tokens.json') ? read(join(REPO, 'packages/design-tokens/tokens.json')) : '';
  const tones = ['coral', 'blue', 'mint', 'violet', 'amber', 'pink', 'lime', 'peach', 'teal', 'ink'];
  let svc = null;
  try {
    svc = JSON.parse(tokens)?.color?.service || null;
  } catch {
    svc = null;
  }
  // the handoff's {fg,bg,fgDark,bgDark} is stored in this repo's {light,dark} form: fg/bg = { light, dark }
  const toneOk = svc ? tones.filter((t) => svc[t] && ['fg', 'bg'].every((k) => svc[t][k]?.light && svc[t][k]?.dark)) : [];
  rows.push(['Tokens: `color.service.<tone>.{fg,bg}` ({light,dark}) for 10 tones (§1 Icons)', toneOk.length === 10 ? 'DONE' : 'TODO', svc ? `${toneOk.length}/10 tones complete` : '`color.service` absent from packages/design-tokens/tokens.json']);
  const readexWeb = grepRepo(['patient-web/app'], /Readex/);
  const tajawal = grepRepo(['patient-web/app'], /Tajawal/);
  rows.push(['Font: Readex Pro self-hosted on patient-web (`next/font/local`)', readexWeb.length && !tajawal.length ? 'DONE' : 'TODO', `Readex refs: ${readexWeb.length}; Tajawal refs still in patient-web/app: ${tajawal.length}${tajawal.length ? ' (' + tajawal.slice(0, 3).join(', ') + ')' : ''}`]);
  const readexApp = grepRepo(['patient-app/app', 'patient-app/src'], /ReadexPro|Readex/);
  rows.push(['Font: Readex Pro on patient-app', readexApp.length ? 'DONE' : 'TODO', `files referencing Readex: ${readexApp.length}`]);
  const phosWeb = grepRepo(['patient-web/app', 'patient-web/components-next', 'packages/ui'], /@phosphor-icons\/react/);
  rows.push(['Icons: `@phosphor-icons/react` (web)', phosWeb.length ? 'IN USE' : 'TODO', `${phosWeb.length} files import it`]);
  const pkgApp = has('patient-app/package.json') ? read(join(REPO, 'patient-app/package.json')) : '';
  rows.push(['Icons: `phosphor-react-native` (app)', /phosphor-react-native/.test(pkgApp) ? 'INSTALLED' : 'TODO', /phosphor-react-native/.test(pkgApp) ? 'in patient-app/package.json' : 'not in patient-app/package.json']);
  const comps = ['FIcon', 'ServiceTile', 'ListRow', 'SectionHeader', 'Card', 'Segmented', 'Chip', 'StatusChip', 'Toggle', 'Radio', 'PrimaryButton', 'OutlineButton', 'IconButton', 'SearchField', 'Stepper', 'StickyFooter', 'TabBar', 'DoctorCard', 'ProductCard', 'OfferCard', 'Timeline', 'ProgressRing', 'EmptyState', 'ErrorState', 'OfflineState'];
  const exportedIn = (dir) => {
    const files = walk(join(REPO, dir), (p) => /\.(tsx?)$/.test(p) && !/\.(test|spec)\./.test(p));
    const src = files.map(read).join('\n');
    return comps.filter((c) => new RegExp(`export\\s+(?:default\\s+)?(?:function|const|class)\\s+${c}\\b|export\\s*\\{[^}]*\\b${c}\\b`).test(src));
  };
  const webC = exportedIn('packages/ui');
  const natC = exportedIn('packages/ui-native');
  rows.push([`Shared components in packages/ui (${comps.length} in §3)`, webC.length === comps.length ? 'DONE' : 'PARTIAL', `exported: ${webC.join(', ') || 'none'}; missing: ${comps.filter((c) => !webC.includes(c)).join(', ')}`]);
  rows.push([`Shared components in packages/ui-native (${comps.length} in §3)`, natC.length === comps.length ? 'DONE' : 'PARTIAL', `exported: ${natC.join(', ') || 'none'}; missing: ${comps.filter((c) => !natC.includes(c)).join(', ')}`]);
  const shellsN = ['Screen', 'AppHeader', 'StickyFooter', 'TabBar'];
  const natS = (() => {
    const src = walk(join(REPO, 'packages/ui-native'), (p) => /\.tsx?$/.test(p)).map(read).join('\n');
    return shellsN.filter((c) => new RegExp(`export\\s+(?:default\\s+)?(?:function|const)\\s+${c}\\b`).test(src));
  })();
  rows.push(['DEVICE_STANDARD §1 native shells (Screen, AppHeader, StickyFooter, TabBar)', natS.length === 4 ? 'DONE' : 'TODO', `present: ${natS.join(', ') || 'none'}`]);
  const webS = (() => {
    const src = walk(join(REPO, 'packages/ui'), (p) => /\.tsx?$/.test(p)).map(read).join('\n');
    return ['AppShell', 'StickyFooter'].filter((c) => new RegExp(`export\\s+(?:default\\s+)?(?:function|const)\\s+${c}\\b`).test(src));
  })();
  rows.push(['DEVICE_STANDARD §1 web shells (AppShell, StickyFooter)', webS.length === 2 ? 'DONE' : 'TODO', `present: ${webS.join(', ') || 'none'}`]);
  const rnSafe = grepRepo(['patient-app/app', 'patient-app/src'], /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/, undefined, { code: true });
  rows.push(['No `SafeAreaView` from `react-native` (patient-app)', rnSafe.length ? 'FAIL' : 'PASS', rnSafe.length ? rnSafe.join(', ') : '0 files']);
  const vh = grepRepo(['patient-web/app', 'patient-web/components-next'], /\b100vh\b/, undefined, { code: true });
  rows.push(['No `100vh` (patient-web)', vh.length ? 'FAIL' : 'PASS', `${vh.length} files${vh.length ? ': ' + vh.slice(0, 5).join(', ') + (vh.length > 5 ? ', …' : '') : ''}`]);
  const vp = grepRepo(['patient-web/app'], /viewport-fit|viewportFit/);
  rows.push(['`viewport-fit=cover` on patient-web', vp.length ? 'PASS' : 'TODO', vp.length ? vp.join(', ') : 'not set']);
  const gates = ['no-raw-color', 'no-emoji-in-ui', 'no-left-right', 'no-100vh', 'no-rn-safeareaview'];
  const present = gates.filter((g) => walk(join(REPO, 'tools/design'), (p) => p.includes(g)).length);
  rows.push(['Lint gates (§6): ' + gates.join(', '), present.length === gates.length ? 'DONE' : 'PARTIAL', `present in tools/design: ${present.join(', ') || 'none'}`]);
  return rows;
}

function fieldGaps() {
  const spec = [
    ['doctor', 'years_experience', 'backend/src/modules/doctors'],
    ['doctor', 'scfhs_license_no', 'backend/src/modules/doctors'],
    ['doctor', 'qualifications', 'backend/src/modules/doctors'],
    ['doctor', 'voice_enabled', 'backend/src/modules/doctors'],
    ['doctor', 'insurance_supported', 'backend/src/modules/doctors'],
    ['doctor', 'clinic_images', 'backend/src/modules/doctors'],
    ['doctor', 'is_accepting', 'backend/src/modules/doctors'],
    ['medicine', 'online_exclusive', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'cold_chain', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'pharmacies_count', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'availability_status', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'covered_by_insurance', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'medical_review_status', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'related_product_ids', 'backend/src/schemas/medicine.schema.ts'],
    ['medicine', 'alternatives', 'backend/src/schemas/medicine.schema.ts'],
  ];
  return spec.map(([entity, field, where]) => {
    const p = join(REPO, where);
    const files = existsSync(p) ? (statSync(p).isDirectory() ? walk(p, (f) => /\.ts$/.test(f) && !/\.spec\./.test(f)) : [p]) : [];
    const re = new RegExp(`\\b${field}\\b`);
    const hit = files.find((f) => re.test(read(f)));
    return [entity, field, hit ? 'present' : 'MISSING', hit ? rel(hit) : where];
  });
}

/* ------------------------------------------------------------- render */

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

function renderInventory(rows, meta) {
  const L = [];
  L.push('# Screen inventory — patient-app + patient-web');
  L.push('');
  L.push(`> Generated by \`node tools/design/screen-inventory.mjs\` at commit \`${meta.commit}\`. Do not edit by hand: re-run the script after routes or API calls change (\`--check\` fails when this file is stale).`);
  L.push('> Source of truth for the rebuild order: `DESIGN_HANDOFF_FINAL.md` §4. Progress per batch lives in `PROGRESS.md`; endpoint health in `WIRING_REPORT.md`.');
  L.push('');
  L.push('**Columns**');
  L.push('- **Template**: hub, list, detail, form, flow step, tracking, result, settings, state (from the route name; correct it in `template()` if wrong). `redirect` = the route only forwards to another one (target in the API column); it needs no design.');
  L.push('- **Board**: closest board in `canvas/` (web uses `ProductWeb`, `HomeWeb`, `SearchWeb`, `AuthWeb` where they exist). `none: <kind>` = no board is close; listed under design gaps in `PROGRESS.md`.');
  L.push('- **Batch**: rebuild order from §4 (0 = core screens whose boards already exist; 13 = web-only pages).');
  L.push('- **API**: endpoints the screen reaches through its own code and the symbols it imports (`METHOD /path`, `:param` = dynamic). `web→` = BFF route in `patient-web/app/api`, `proxy→` = `/api/patient/*` proxy. Full list per route in `inventory/screens.json`.');
  L.push('- **Status**: rebuild state from `docs/design/screen-status.json` (`"<app> <route>": "in progress" | "done (#PR)"`). `—` = not started. Every rebuild PR updates that file, re-runs this script and updates `PROGRESS.md`.');
  L.push('');
  const byBatch = new Map();
  for (const r of rows) {
    if (!byBatch.has(r.batch)) byBatch.set(r.batch, []);
    byBatch.get(r.batch).push(r);
  }
  L.push('## Totals');
  L.push('');
  L.push('| App | Routes | With API calls | Templates |');
  L.push('|---|---|---|---|');
  for (const app of ['patient-app', 'patient-web']) {
    const rs = rows.filter((r) => r.app === app);
    const tc = TEMPLATES.map((t) => `${t} ${rs.filter((r) => r.template === t).length}`).join(', ');
    L.push(`| ${app} | ${rs.length} | ${rs.filter((r) => r.calls.length).length} | ${tc} |`);
  }
  L.push('');
  L.push('| Batch | Scope | app routes | web routes |');
  L.push('|---|---|---|---|');
  const names = new Map(BATCHES.map(([n, label]) => [n, label]));
  for (const n of [...byBatch.keys()].sort((a, b) => a - b)) {
    const rs = byBatch.get(n);
    L.push(`| ${n} | ${names.get(n) || 'account, settings, support, returns'} | ${rs.filter((r) => r.app === 'patient-app').length} | ${rs.filter((r) => r.app === 'patient-web').length} |`);
  }
  L.push('');
  for (const n of [...byBatch.keys()].sort((a, b) => a - b)) {
    L.push(`## Batch ${n} — ${names.get(n) || 'account, settings, support, returns'}`);
    L.push('');
    L.push('| App | Route | File | Template | Board | API | Status |');
    L.push('|---|---|---|---|---|---|---|');
    const rs = byBatch.get(n).sort((a, b) => a.route.localeCompare(b.route) || a.app.localeCompare(b.app));
    for (const r of rs) {
      const shown = r.calls.slice(0, 8).map((c) => `\`${c.method} ${c.target === 'web-bff' ? 'web→' : c.target === 'web-proxy' ? 'proxy→' : c.target === 'ai-service' ? 'ai→' : ''}${c.target === 'web-proxy' ? c.path.replace('/api/patient', '') : c.target === 'web-bff' ? c.path.replace('/api', '') : c.path}\``);
      const more = r.calls.length > 8 ? ` +${r.calls.length - 8} more` : '';
      const api = r.redirect ? `→ \`${esc(r.redirect)}\`` : shown.join('<br>') || '—';
      L.push(`| ${r.app === 'patient-app' ? 'app' : 'web'} | \`${esc(r.route)}\` | \`${esc(r.file)}\` | ${r.template} | ${r.board} | ${api}${more} | ${esc(r.status)} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

function renderWiring(rows, meta, found, gaps, x) {
  const L = [];
  L.push('# Wiring report — screens ↔ API, and design foundation');
  L.push('');
  L.push(`> Generated by \`node tools/design/screen-inventory.mjs\` at commit \`${meta.commit}\`. Do not edit by hand.`);
  L.push('> Read at the start of every design session together with `PROGRESS.md` and `SCREEN_INVENTORY.md`. A screen is rebuilt on real API data only (handoff §1, §6): any row below that is not `OK` must be fixed or the UI element hidden — never faked.');
  L.push('');
  const unres = (app) => rows.filter((r) => r.app === app).reduce((s, r) => s + r.unresolved, 0);
  L.push(`- **Unresolved calls (built from variables):** patient-app ${unres('patient-app')}, patient-web ${unres('patient-web')} (section 3b)`);
  L.push(`- **Needs review:** ${x.needs.length} open item${x.needs.length === 1 ? '' : 's'} (section 7)`);
  L.push(`- **Mock / placeholder hits (heuristic):** ${x.mock.found.length}, of which Batch 0: ${x.mock.found.filter((h) => h.batch0).length} (section 6)`);
  L.push('- **Per-screen element audits:** [`docs/design/audit/`](audit/) (`batch-0-web.md`, `batch-0-app.md`: every element of a screen against its board and its data source)');
  L.push('');
  L.push('## 1. Design foundation (handoff §1, §3, §6; DEVICE_STANDARD §1, §5)');
  L.push('');
  L.push('| Item | State | Evidence |');
  L.push('|---|---|---|');
  for (const [a, b, c] of found) L.push(`| ${esc(a)} | ${b} | ${esc(c)} |`);
  L.push('');
  L.push('## 2. Backend fields the detail specs need (`SPEC_PRODUCT_DOCTOR_DETAIL.md`)');
  L.push('');
  L.push('`MISSING` = the field name does not appear in the backend module/schema. The UI hides that row until the field exists and is filled; never invent a value. Owner, 2026-10-04: the reviewer session adds `scfhs_license_no`, `years_experience` and `qualifications[]` (entered at registration, approved by the admin). `voice_consultation_fee` is removed from the design: there is one call, priced `video_consultation_fee || consultation_fee`.');
  L.push('');
  L.push('| Entity | Field | State | Where checked |');
  L.push('|---|---|---|---|');
  for (const g of gaps) L.push(`| ${g.map(esc).join(' | ')} |`);
  L.push('');

  const all = [];
  for (const r of rows) for (const c of r.calls) all.push({ r, c });
  const count = (s) => all.filter((x) => x.c.status === s).length;
  const statuses = ['OK', 'WRONG_METHOD', 'NO_ROUTE', 'PROXY_BLOCKED', 'PROXY_BLOCKED?', 'NO_HANDLER', 'EXTERNAL', 'PARTIAL'];
  L.push('## 3. Endpoint wiring summary');
  L.push('');
  L.push('Every (route, endpoint) pair found statically. Statuses:');
  L.push('- `OK`: a backend controller (or BFF handler) serves this path and method.');
  L.push('- `WRONG_METHOD`: the path exists but not with this method.');
  L.push('- `NO_ROUTE`: no backend controller serves this path (after stripping `/api/v1`).');
  L.push('- `PROXY_BLOCKED`: web call through `/api/patient/*` that `patient-web/lib/api/patient-allowlist.ts` rejects (the proxy answers 404), checked with a sample UUID for each `:param`.');
  L.push('- `PROXY_BLOCKED?`: as above, but the path has params; it is blocked for a UUID, a slug and every short string literal of the calling file. Confirm with the values the screen really sends.');
  L.push('- `NO_HANDLER`: web call to `/api/*` with no route handler in `patient-web/app/api`.');
  L.push('- `EXTERNAL`: AI service (`EXPO_PUBLIC_AI_URL`), not checked here.');
  L.push('- `PARTIAL`: the path ends in a variable suffix (`${id}${suffix}`); only the prefix is known (shown with `/…`), so it is not checked.');
  L.push('');
  L.push('| App | Pairs | ' + statuses.join(' | ') + ' | unresolved calls (built from variables) |');
  L.push('|---|---|' + statuses.map(() => '---').join('|') + '|---|');
  for (const app of ['patient-app', 'patient-web']) {
    const xs = all.filter((x) => x.r.app === app);
    const un = rows.filter((r) => r.app === app).reduce((s, r) => s + r.unresolved, 0);
    L.push(`| ${app} | ${xs.length} | ${statuses.map((s) => xs.filter((x) => x.c.status === s).length).join(' | ')} | ${un} |`);
  }
  L.push('');
  L.push(`Totals: ${all.length} pairs, ${count('OK')} OK, ${count('PARTIAL')} partial (not checkable), ${all.length - count('OK') - count('EXTERNAL') - count('PARTIAL')} need attention.`);
  L.push('');
  L.push(...renderCalls3b(rows, x));
  L.push('## 4. Endpoints that are not wired (fix in the batch that rebuilds the screen)');
  L.push('');
  const bad = new Map();
  for (const { r, c } of all) {
    if (c.status === 'OK' || c.status === 'EXTERNAL' || c.status === 'PARTIAL') continue;
    const k = `${r.app}|${c.status}|${c.method} ${c.path}`;
    if (!bad.has(k)) bad.set(k, { app: r.app, status: c.status, call: `${c.method} ${c.path}`, note: c.note || '', where: c.file + ':' + c.line, routes: new Set(), batch: r.batch });
    const b = bad.get(k);
    b.routes.add(r.route);
    b.batch = Math.min(b.batch, r.batch);
  }
  const badRows = [...bad.values()].sort((a, b) => a.batch - b.batch || a.app.localeCompare(b.app) || a.call.localeCompare(b.call));
  if (!badRows.length) L.push('None.');
  else {
    L.push('| Batch | App | Status | Call | Called at | Screens | Note |');
    L.push('|---|---|---|---|---|---|---|');
    for (const b of badRows) {
      const rs = [...b.routes];
      L.push(`| ${b.batch} | ${b.app === 'patient-app' ? 'app' : 'web'} | ${b.status} | \`${esc(b.call)}\` | \`${esc(b.where)}\` | ${rs.slice(0, 4).map((x) => '`' + esc(x) + '`').join(', ')}${rs.length > 4 ? ` +${rs.length - 4}` : ''} | ${esc(b.note)} |`);
    }
  }
  L.push('');
  L.push('## 5. Screens with no API call found');
  L.push('');
  L.push('Redirect-only routes are left out (they are tagged `redirect` in the inventory). The rest are static pages, client-only tools, or screens whose calls are built from variables. Check each one by hand when its batch starts; a screen that shows data must get it from the API.');
  L.push('');
  for (const app of ['patient-app', 'patient-web']) {
    const rs = rows.filter((r) => r.app === app && !r.calls.length && !r.redirect).map((r) => '`' + r.route + '`');
    L.push(`- **${app}** (${rs.length}): ${rs.join(', ')}`);
  }
  L.push('');
  L.push(...renderStatic5b(rows, x.statics, x.needs));
  L.push(...renderMock(x.mock));
  L.push(...renderNeeds(x.needs));
  return L.join('\n');
}

/* ------------------------------------- Needs review, static screens, mock scan */

const NEEDS_REVIEW_KEYS = ['batch', 'app', 'screen', 'element', 'file', 'line', 'found', 'suspect'];

// docs/design/needs-review/*.json: each a JSON array of { batch, app, screen, element, file, line, found, suspect }.
// Written by several agents in parallel, merged here; a malformed file stops the run with its name.
function loadNeedsReview() {
  const dir = join(REPO, 'docs/design/needs-review');
  if (!existsSync(dir)) return [];
  const out = [];
  const fail = (msg) => {
    console.error(`docs/design/needs-review/${msg}`);
    process.exit(2);
  };
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    let arr;
    try {
      arr = JSON.parse(read(join(dir, f)));
    } catch (e) {
      fail(`${f}: invalid JSON (${e.message})`);
    }
    if (!Array.isArray(arr)) fail(`${f}: must be a JSON array`);
    arr.forEach((raw, i) => {
      if (!raw || typeof raw !== 'object') fail(`${f}[${i}]: must be an object`);
      // Journey audits (needs-review/journeys*.json) use { scenario, step, problem, kind, file, line }; map them to the slice shape.
      const o = 'scenario' in raw && !('batch' in raw)
        ? { batch: 'journeys', app: String(raw.file || '').startsWith('patient-web/') ? 'web' : 'app', screen: `scenario ${raw.scenario}: ${raw.step}`, element: raw.kind, file: raw.file, line: raw.line, found: raw.problem, suspect: raw.kind }
        : raw;
      for (const k of NEEDS_REVIEW_KEYS) if (!(k in o)) fail(`${f}[${i}]: missing "${k}"`);
      out.push({ ...o, src: f });
    });
  }
  const bn = (x) => (Number.isFinite(Number(x.batch)) ? Number(x.batch) : 99);
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return out.sort((a, b) => bn(a) - bn(b) || cmp(String(a.app), String(b.app)) || cmp(String(a.screen), String(b.screen)) || cmp(String(a.file), String(b.file)) || cmp(Number(a.line) || 0, Number(b.line) || 0) || cmp(String(a.element), String(b.element)) || cmp(a.src, b.src));
}

// docs/design/inventory/static-screens.json: { "<route>": { file, verdict, reason } } for the web screens that call no API.
const VERDICTS = { static: 'STATIC (by design)', thin: 'STATIC (pointer page)', suspicious: 'SUSPICIOUS', untraced: 'UNTRACED' };
function loadStaticScreens() {
  const f = join(REPO, 'docs/design/inventory/static-screens.json');
  return existsSync(f) ? JSON.parse(read(f)) : {};
}

// Files whose hard-coded data and dead controls are scanned: every file a route reaches (symbol closure, own app only),
// every file in the route trees (layouts, co-located components), and the Batch 0 component folders.
const BATCH0_DIRS = ['patient-web/components-next/auth/', 'patient-web/components-next/home/', 'patient-web/components-next/core/', 'patient-app/src/components/auth/', 'patient-app/src/components/home/', 'patient-app/src/components/navigation/', 'patient-app/src/components/screen/'];

function mockFindings(rows, closureFiles) {
  const scope = new Set();
  const add = (abs) => {
    const r = typeof abs === 'string' && abs.startsWith(REPO) ? rel(abs) : abs;
    if ((r.startsWith('patient-app/') || r.startsWith('patient-web/')) && !r.startsWith('patient-web/app/api/') && isScanned(r) && isFile(join(REPO, r))) scope.add(r);
  };
  for (const set of closureFiles) for (const f of set) add(f);
  for (const app of Object.values(APPS)) for (const f of walk(app.routesDir, (p) => /\.(tsx?|jsx?)$/.test(p))) add(f);
  for (const d of BATCH0_DIRS) for (const f of walk(join(REPO, d), (p) => /\.(tsx?|jsx?)$/.test(p))) add(f);
  // Batch 0 = its route files, the files beside a non-root web route file, and the Batch 0 component folders
  const b0 = new Set();
  for (const r of rows.filter((x) => x.batch === 0)) {
    b0.add(r.file);
    const dir = dirname(r.file);
    if (r.app === 'patient-web' && dir !== rel(APPS['patient-web'].routesDir)) for (const f of scope) if (dirname(f) === dir) b0.add(f);
  }
  const isB0 = (f) => b0.has(f) || BATCH0_DIRS.some((d) => f.startsWith(d));
  const files = [...scope].sort().map((r) => ({ rel: r, app: r.startsWith('patient-web/') ? 'patient-web' : 'patient-app', src: read(join(REPO, r)) }));
  // identical fallbacks repeated in one file (14 insurers each with `defaultCoPay: 0.2`) count and print once
  const groups = new Map();
  for (const x of scanMock(ts, files)) {
    const k = x.group ? `${x.app}|${x.category}|${x.file}|${x.group}` : `${x.app}|${x.category}|${x.file}|${x.line}|${x.snippet}|${x.sub || ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  const found = [...groups.values()].map((g) => ({ ...g[0], batch0: isB0(g[0].file), more: g.length - 1, lines: g.map((y) => y.line) }));
  return { found, scanned: files.length, scannedBatch0: files.filter((f) => isB0(f.rel)).length };
}

/* ------------------------------------------------- new report sections */

const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const cell = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

// 3b. how every call built from variables was resolved
function renderCalls3b(rows, x) {
  const L = [];
  const count = (app) => rows.filter((r) => r.app === app).reduce((s, r) => s + r.unresolved, 0);
  L.push('## 3b. Calls built from variables: how each was resolved');
  L.push('');
  L.push(`Unresolved calls now: **patient-app ${count('patient-app')}, patient-web ${count('patient-web')}**. The tool used to count the same few call sites once for every route that imports them. Every site is now one of the kinds below (`+ '`DEBUG_UNRESOLVED=1 node tools/design/screen-inventory.mjs` lists any that remain).');
  L.push('');
  L.push('### Generic wrappers: the path is attributed at each caller');
  L.push('');
  L.push('A wrapper forwards its own parameter to `fetch` (`fetch(patientApiUrl(path))`), so the call cannot name a path where it is written; each caller of the wrapper is scanned and carries its own path. The table counts those callers, so a caller that hides its path would show up in the last column.');
  L.push('');
  L.push('| Wrapper | Forwards at | Callers | Path resolved at caller | Forwards again | Not resolvable |');
  L.push('|---|---|---|---|---|---|');
  for (const c of x.census) L.push(`| ${code(c.fn)} | ${code(c.file + ':' + c.line)} | ${c.callers} | ${c.resolved} | ${c.forwarding} | ${c.other.length ? c.other.map(code).join(', ') : '0'} |`);
  L.push('');
  const replays = x.wrapperSites.filter((w) => w.replay);
  if (replays.length) {
    L.push('Not a wrapper but not a new call either: ' + replays.map((w) => `${code(w.file + ':' + w.line)} (${code(w.call)}) re-sends the request an axios interceptor just saw fail; that request is counted at its own call site`).join('; ') + '.');
    L.push('');
  }
  L.push('### Request builders: resolved by following the builder\'s returned path');
  L.push('');
  const seen = new Map();
  for (const r of rows) for (const c of r.calls) if (c.via === 'request builder') seen.set(`${c.file}:${c.line}|${c.method} ${c.path}`, c);
  const built = [...seen.values()].sort((a, b) => (a.file + String(a.line).padStart(6, '0') < b.file + String(b.line).padStart(6, '0') ? -1 : 1));
  if (!built.length) L.push('None.');
  else {
    L.push('| Call site | Resolved to | Status | Served by |');
    L.push('|---|---|---|---|');
    for (const c of built) L.push(`| ${code(c.file + ':' + c.line)} | ${code(c.method + ' ' + c.path)} | ${c.status} | ${c.backend || c.handler ? code(c.backend || c.handler) : '—'} |`);
    const notOk = built.filter((c) => c.status !== 'OK');
    L.push('');
    L.push(notOk.length ? `Not OK: ${notOk.map((c) => `${code(c.method + ' ' + c.path)} (${c.status})`).join(', ')}.` : 'All of them match a real route (`OK`).');
  }
  L.push('');
  const manual = [];
  for (const r of rows) for (const c of r.calls) if (c.via === 'manual-calls.json') manual.push(c);
  L.push('### Hand-written entries (`inventory/manual-calls.json`)');
  L.push('');
  L.push('`{"file:line": {"method", "path", "note"}}`, merged by the tool. `--check` fails when an entry no longer points at an unresolved call site.');
  L.push('');
  const man = [...new Map(manual.map((c) => [`${c.file}:${c.line}`, c])).values()];
  L.push(man.length ? man.map((c) => `- ${code(c.file + ':' + c.line)} → ${code(c.method + ' ' + c.path)} (${c.status}): ${c.note}`).join('\n') : 'None needed.');
  L.push('');
  const un = [...x.unresolvedSites.values()];
  L.push('### Still unresolved');
  L.push('');
  L.push(un.length ? un.map((u) => `- ${code(u.file + ':' + u.line)} ${code(u.call)}`).join('\n') : 'None.');
  L.push('');
  return L;
}

// 5b. web screens with no API call
function renderStatic5b(rows, statics, needs) {
  const L = [];
  const none = rows.filter((r) => r.app === 'patient-web' && !r.calls.length && !r.redirect).sort((a, b) => a.route.localeCompare(b.route));
  L.push('## 5b. Web screens with no API calls');
  L.push('');
  L.push(`Each of the ${none.length} was classified by reading its page and the components it imports (verdicts live in \`inventory/static-screens.json\`). SUSPICIOUS and UNTRACED verdicts are always listed in section 7 (Needs review); a pointer page whose copy claims more than it shows can be there too.`);
  L.push('');
  L.push('| Route | File | Verdict | Reason |');
  L.push('|---|---|---|---|');
  const inReview = new Set(needs.filter((n) => n.app === 'patient-web').map((n) => n.screen));
  for (const r of none) {
    const s = statics[r.route];
    const verdict = s ? VERDICTS[s.verdict] || `?${s.verdict}` : 'UNCLASSIFIED';
    const flag = s && (s.verdict === 'suspicious' || s.verdict === 'untraced') ? (inReview.has(r.route) ? ' (in Needs review)' : ' (NOT in Needs review: add it)') : '';
    L.push(`| ${code(r.route)} | ${code(r.file)} | ${verdict}${flag} | ${cell(s ? s.reason : 'not classified yet: add it to inventory/static-screens.json')} |`);
  }
  const stale = Object.keys(statics).filter((k) => !none.some((r) => r.route === k));
  if (stale.length) L.push('', `Stale entries in static-screens.json (the screen now calls an API or is gone): ${stale.map(code).join(', ')}.`);
  L.push('');
  return L;
}

// 8. mock / placeholder scan
function renderMock(m) {
  const L = [];
  const apps = ['patient-app', 'patient-web'];
  const total = (f) => m.found.filter(f).length;
  L.push('## 6. Mock / placeholder found (heuristic)');
  L.push('');
  L.push(`**Heuristic scan, not a proof.** \`tools/design/mock-scan.mjs\` reads the TypeScript AST of ${m.scanned} source files (the files each route reaches, the route trees and their layouts, and the Batch 0 component folders; ${m.scannedBatch0} of them are Batch 0) and lists code that looks like fake data or a dead control. A hit is a lead to check, a miss is not a guarantee. Each pattern was sampled on real hits and tightened until false positives were rare; when a pattern finds nothing it says so.`);
  L.push('');
  L.push('Ignored: tests and fixtures, `node_modules`, the generated mirror `patient-web/components-next/ui-generated`, i18n dictionaries, `placeholder=` attributes and props (input hints), `console.*` arguments and error messages. **B0** = Batch 0: its route files, the files beside a web Batch 0 route, `patient-web/components-next/{auth,home,core}` and `patient-app/src/components/{auth,home,navigation,screen}`.');
  L.push('');
  L.push('| Category | app B0 | app rest | web B0 | web rest | Total |');
  L.push('|---|---|---|---|---|---|');
  for (const [id, label] of MOCK_CATEGORIES) {
    const c = (app, b0) => total((x) => x.category === id && x.app === app && x.batch0 === b0);
    L.push(`| ${label} | ${c('patient-app', true)} | ${c('patient-app', false)} | ${c('patient-web', true)} | ${c('patient-web', false)} | ${total((x) => x.category === id)} |`);
  }
  L.push(`| **All** | ${total((x) => x.app === 'patient-app' && x.batch0)} | ${total((x) => x.app === 'patient-app' && !x.batch0)} | ${total((x) => x.app === 'patient-web' && x.batch0)} | ${total((x) => x.app === 'patient-web' && !x.batch0)} | ${m.found.length} |`);
  L.push('');
  for (const app of apps) {
    const mine = m.found.filter((x) => x.app === app);
    L.push(`### ${app} (${mine.length})`);
    L.push('');
    for (const [id, label] of MOCK_CATEGORIES) {
      const hits = mine.filter((x) => x.category === id);
      const items = hits;
      L.push(`#### ${label}: ${hits.length}${hits.some((h) => h.batch0) ? ` (Batch 0: ${hits.filter((h) => h.batch0).length})` : ''}`);
      L.push('');
      if (!items.length) {
        L.push('None found.');
        L.push('');
        continue;
      }
      const line = (h) => `- ${h.batch0 ? '**B0** ' : ''}${code(h.file + ':' + h.line)}${h.sub ? ' [' + h.sub + ']' : ''} ${code(h.snippet)}${h.more ? ` (same in ${h.more} more place${h.more === 1 ? '' : 's'}: line${h.more === 1 ? '' : 's'} ${h.lines.slice(1).join(', ')})` : ''}`;
      const b0 = items.filter((h) => h.batch0);
      const rest = items.filter((h) => !h.batch0);
      for (const h of b0) L.push(line(h));
      if (rest.length > 12) {
        L.push('', `<details><summary>${rest.length} outside Batch 0</summary>`, '');
        for (const h of rest) L.push(line(h));
        L.push('', '</details>');
      } else for (const h of rest) L.push(line(h));
      L.push('');
    }
  }
  return L;
}

// 9. Needs review (rendered from docs/design/needs-review/*.json)
function renderNeeds(needs) {
  const L = [];
  L.push('## 7. Needs review');
  L.push('');
  L.push(`${needs.length} open item${needs.length === 1 ? '' : 's'}, merged from \`docs/design/needs-review/*.json\` (format in that folder's README). These are things an agent found while rebuilding or auditing a screen and could not settle from the client code. **The reviewer session verifies each one and fixes backend gaps; a design session only reports.** Per-screen element audits are in [\`docs/design/audit/\`](audit/).`);
  L.push('');
  if (!needs.length) {
    L.push('None.');
    L.push('');
    return L;
  }
  let head = '';
  for (const n of needs) {
    const h = `Batch ${n.batch} — ${n.app}`;
    if (h !== head) {
      head = h;
      L.push('', `### ${h}`, '', '| Screen | Element | file:line | What was found | What is suspected |', '|---|---|---|---|---|');
    }
    L.push(`| ${code(n.screen)} | ${cell(n.element)} | ${code(n.file + (n.line ? ':' + n.line : ''))} | ${cell(n.found)} | ${cell(n.suspect)} |`);
  }
  L.push('');
  return L;
}

/* --------------------------------------------------------------- main */

async function main() {
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).stdout.trim();
  collectWrappers();
  const manualFile = join(REPO, 'docs/design/inventory/manual-calls.json');
  if (existsSync(manualFile)) for (const [k, v] of Object.entries(JSON.parse(read(manualFile)))) MANUAL.set(k, v);
  if (process.env.DEBUG_WRAPPERS) console.error([...WRAPPERS].map(([k, v]) => `${k}:${v.arg}:${v.method}`).join(" "), '\nBUILDERS', [...BUILDERS].map(([k, v]) => `${k}=${v.map((x) => x.path).join('|')}`).join(' '));
  const routes = [...patientAppRoutes(), ...patientWebRoutes()];
  const be = backendRoutes();
  const bff = webBffHandlers();
  const allow = await loadAllowlist();
  // per-screen rebuild status, keyed "<app> <route>" (or "<app> <file>" when two files share a route)
  const statusFile = join(REPO, 'docs/design/screen-status.json');
  const status = existsSync(statusFile) ? JSON.parse(read(statusFile)) : {};

  const closureFiles = [];
  const rows = routes.map((r) => {
    const cl = closure(r.app, r.file);
    closureFiles.push(cl.fileSet);
    const calls = cl.calls.map((c) => {
      const out = { ...c };
      if (c.partial) out.status = 'PARTIAL';
      else if (c.target === 'ai-service') out.status = 'EXTERNAL';
      else if (c.target === 'web-bff') {
        const m = matchBff(bff, c.method, c.path);
        out.status = m.status === 'OK' ? 'OK' : m.status === 'WRONG_METHOD' ? 'WRONG_METHOD' : 'NO_HANDLER';
        if (m.handler) out.handler = rel(m.handler.file);
        if (m.status === 'WRONG_METHOD') out.note = `handler exports ${m.handler.methods.join(', ') || 'no method'}`;
      } else if (c.target === 'web-proxy') {
        // a specific route handler under app/api/patient/ wins over the [...path] proxy (Next routing)
        const specific = matchBff(bff.filter((h) => !h.segs.some((x) => x.startsWith('[...'))), c.method, c.path);
        if (specific.status !== 'NO_HANDLER') {
          out.target = 'web-bff';
          out.status = specific.status;
          out.handler = rel(specific.handler.file);
          if (specific.status === 'WRONG_METHOD') out.note = `handler exports ${specific.handler.methods.join(', ') || 'no method'}`;
          return out;
        }
        const bePath = c.path.replace(/^\/api\/patient/, '');
        const method = c.method === '*' ? 'GET' : c.method;
        // params are sampled as a UUID, a short slug, and every short string literal of the calling file
        // (so `insurance/${intent}/accept` with `type Intent = "co-pay" | "self-pay"` is tried with both)
        const n = (bePath.match(/:param/g) || []).length;
        const cands = [SAMPLE_ID, 'a1', ...fileLiterals(join(REPO, c.file))].slice(0, 40);
        const combos = n === 0 ? [[]] : n <= 2 ? cands.flatMap((x) => (n === 1 ? [[x]] : cands.map((y) => [x, y]))) : [Array(n).fill(SAMPLE_ID)];
        const fill = (vals) => { let i = 0; return bePath.replace(/:param/g, () => vals[i++]); };
        const sampleQ = (c.query || '').replace(/:param/g, SAMPLE_ID);
        const allowed = !allow || combos.some((vals) => allow(fill(vals), sampleQ, method));
        const m = matchRoute(be, c.method, bePath);
        if (m.route) out.backend = m.route.src;
        if (allowed) out.status = m.status;
        else {
          out.status = bePath.includes(':param') ? 'PROXY_BLOCKED?' : 'PROXY_BLOCKED';
          if (bePath.includes(':param')) out.note = 'blocked for every sample param value (UUID, slug, literals of the file)';
          if (m.status !== 'OK') out.note = (out.note ? out.note + '; ' : '') + 'no backend route either';
        }
      } else {
        const m = matchRoute(be, c.method, c.path);
        out.status = m.status;
        if (m.route) out.backend = m.route.src;
        if (m.status === 'WRONG_METHOD') out.note = `backend has ${m.methods.join(', ')}`;
      }
      return out;
    });
    calls.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    const redirect = redirectTarget(r.file);
    return {
      app: r.app,
      route: r.route,
      file: rel(r.file),
      redirect,
      template: redirect ? 'redirect' : template(r.classRoute || r.route),
      board: redirect ? '— (redirect)' : board(r.app, r.classRoute || r.route),
      batch: batch(r.classRoute || r.route),
      status: redirect ? 'n/a' : status[`${r.app} ${rel(r.file)}`] || status[`${r.app} ${r.route}`] || '—',
      calls,
      files: cl.files,
      unresolved: cl.unresolved,
    };
  });
  rows.sort((a, b) => a.app.localeCompare(b.app) || a.route.localeCompare(b.route));

  // every manual-calls.json entry must still sit on an unresolved call site
  const staleManual = [...MANUAL.keys()].filter((k) => !MANUAL_USED.has(k));
  if (staleManual.length) {
    console.error(`docs/design/inventory/manual-calls.json: no unresolved call site at ${staleManual.join(', ')} (the line moved, or the call is now resolved: update or delete the entry)`);
    process.exit(1);
  }
  const unresolvedSites = new Map(UNRESOLVED_SITES);
  const wrapperSites = [...WRAPPER_SITES.values()];
  const extra = {
    census: wrapperCensus(),
    wrapperSites,
    unresolvedSites,
    statics: loadStaticScreens(),
    needs: loadNeedsReview().filter((n) => n.app !== 'provider-app'),
    mock: mockFindings(rows, closureFiles),
  };

  const meta = { commit };
  const outputs = {
    'docs/design/SCREEN_INVENTORY.md': renderInventory(rows, meta) + '\n',
    'docs/design/WIRING_REPORT.md': renderWiring(rows, meta, foundation(), fieldGaps(), extra) + '\n',
    'docs/design/inventory/screens.json': JSON.stringify({ commit, routes: rows }, null, 1) + '\n',
  };

  // provider-app (React Navigation, not expo-router): own pass after the patient files are done, own output files
  Object.assign(outputs, buildProvider({
    ts, REPO, rel, read, walk, analyseFile, resolveSpec, closure, isCallerCallee, WRAPPERS, BUILDERS, REQ_BUILDERS, collectWrappers,
    matchRoute, be, commit, loadNeedsReview, scanMock,
    overrides: existsSync(join(REPO, 'docs/design/inventory/provider-audit-overrides.json')) ? JSON.parse(read(join(REPO, 'docs/design/inventory/provider-audit-overrides.json'))) : {}, UNRESOLVED_SITES, WRAPPER_SITES, MANUAL, MANUAL_USED, fileCache, join, existsSync, readdirSync,
  }));

  if (CHECK) {
    // the commit line differs on every commit; compare everything else
    const strip = (s) => s.replace(/at commit `[0-9a-f]+`/g, '').replace(/"commit": "[0-9a-f]+"/, '');
    const stale = Object.entries(outputs).filter(([p, s]) => !existsSync(join(REPO, p)) || strip(read(join(REPO, p))) !== strip(s));
    for (const [p] of stale) console.error(`stale: ${p} — run node tools/design/screen-inventory.mjs`);
    process.exit(stale.length ? 1 : 0);
  }

  mkdirSync(join(REPO, 'docs/design/inventory'), { recursive: true });
  for (const [p, s] of Object.entries(outputs)) writeFileSync(join(REPO, p), s);
  const pairs = rows.flatMap((r) => r.calls);
  const by = (s) => pairs.filter((c) => c.status === s).length;
  console.log(`commit ${commit}`);
  console.log(`routes: patient-app ${rows.filter((r) => r.app === 'patient-app').length}, patient-web ${rows.filter((r) => r.app === 'patient-web').length}`);
  console.log(`endpoint pairs: ${pairs.length} — OK ${by('OK')}, WRONG_METHOD ${by('WRONG_METHOD')}, NO_ROUTE ${by('NO_ROUTE')}, PROXY_BLOCKED ${by('PROXY_BLOCKED')}, PROXY_BLOCKED? ${by('PROXY_BLOCKED?')}, PARTIAL ${by('PARTIAL')}, NO_HANDLER ${by('NO_HANDLER')}, EXTERNAL ${by('EXTERNAL')}`);
  console.log(`boards: ${[...new Set(rows.map((r) => r.board))].length} distinct; routes without a board: ${rows.filter((r) => r.board.startsWith('none')).length}`);
}

main();
