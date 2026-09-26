#!/usr/bin/env node
/*
 * P3.1 helper: collect every client write call (admin, provider-app,
 * patient-web, patient-app) with its URL and the payload keys it sends, so
 * DTOs (whitelist + forbidNonWhitelisted) can be checked against what the
 * apps really send.
 *
 *   node tools/audit/clientbodies.js > clients.json      (run from repo root)
 */
const path = require('path');
const fs = require('fs');
const ts = require(path.resolve('backend/node_modules/typescript'));

const APPS = ['admin/src', 'provider-app/src', 'patient-web/app', 'patient-web/lib', 'patient-web/components', 'patient-web/components-next', 'patient-app/app', 'patient-app/src', 'patient-app/components', 'patient-app/lib', 'patient-app/services', 'patient-app/hooks'];
const VERBS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

function urlOf(node, sf) {
  if (!node) return null;
  let t = null;
  if (ts.isStringLiteralLike(node)) t = node.text;
  else if (ts.isTemplateExpression(node)) {
    t = node.head.text;
    for (const span of node.templateSpans) t += ':x' + span.literal.text;
  } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = urlOf(node.left, sf); const r = urlOf(node.right, sf);
    t = (l ?? ':x') + (r ?? ':x');
  }
  if (t == null || !t.includes('/')) return null;
  t = t.split('?')[0];
  t = t.replace(/^(:x)+/, '').replace(/^https?:\/\/[^/]+/, '');
  t = t.replace(/^\/?api\/v1/, '').replace(/^\/?v1(?=\/)/, '');
  if (!t.startsWith('/')) t = '/' + t;
  return t.replace(/\/+$/, '') || '/';
}

function keysOfObject(obj, sf) {
  const keys = []; let spread = false;
  for (const p of obj.properties) {
    if (ts.isSpreadAssignment(p)) spread = true;
    // `key: undefined` is dropped by JSON.stringify — not sent.
    else if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.initializer) && p.initializer.text === 'undefined') continue;
    else if (p.name) keys.push(p.name.getText(sf).replace(/['"]/g, ''));
  }
  return { keys, spread };
}

/** Resolve a body expression to its keys (object literal, JSON.stringify(x), or a local const). */
function bodyKeys(expr, sf) {
  if (!expr) return { keys: [], spread: false, unresolved: 'none' };
  if (ts.isCallExpression(expr) && /JSON\.stringify$/.test(expr.expression.getText(sf))) return bodyKeys(expr.arguments[0], sf);
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) return bodyKeys(expr.expression, sf);
  if (ts.isObjectLiteralExpression(expr)) return keysOfObject(expr, sf);
  if (ts.isIdentifier(expr)) {
    // nearest preceding `const <name> = { ... }` in the enclosing function
    let fn = expr.parent;
    while (fn && !ts.isFunctionLike(fn) && !ts.isSourceFile(fn)) fn = fn.parent;
    let found = null;
    const visit = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === expr.text && n.initializer && n.getStart() < expr.getStart()) found = n.initializer;
      ts.forEachChild(n, visit);
    };
    if (fn) visit(fn);
    if (found && ts.isObjectLiteralExpression(found)) return keysOfObject(found, sf);
    // React form state: const [form, setForm] = useState({ ...initial keys })
    let stateInit = null;
    const visitState = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.name.elements[0] && n.name.elements[0].name && n.name.elements[0].name.getText(sf) === expr.text
          && n.initializer && ts.isCallExpression(n.initializer) && /useState$/.test(n.initializer.expression.getText(sf)) && n.initializer.arguments[0]) stateInit = n.initializer.arguments[0];
      ts.forEachChild(n, visitState);
    };
    visitState(sf);
    if (stateInit) { let e = stateInit; while (ts.isAsExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression; if (ts.isObjectLiteralExpression(e)) return { ...keysOfObject(e, sf), fromState: true }; }
    return { keys: [], spread: false, unresolved: 'var:' + expr.text };
  }
  if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'data' && ts.isIdentifier(expr.expression)) {
    const zk = zodKeys(expr.expression.text, sf);
    if (zk) return { keys: zk, spread: false, fromZod: true };
  }
  return { keys: [], spread: false, unresolved: expr.getText(sf).slice(0, 60) };
}

/** keys of z.object({...}) behind `const <resVar> = <schema>.safeParse(...)` (or .parse) in this file */
function zodKeys(resVar, sf) {
  let schemaName = null;
  const findRes = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === resVar && n.initializer) {
      let e = n.initializer; if (ts.isAwaitExpression(e)) e = e.expression;
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && /^(safeParse|parse)$/.test(e.expression.name.text)) schemaName = e.expression.expression.getText(sf);
    }
    ts.forEachChild(n, findRes);
  };
  findRes(sf);
  if (!schemaName) return null;
  let obj = null;
  const findSchema = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === schemaName && n.initializer) {
      let e = n.initializer;
      while (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text !== 'object') e = e.expression.expression;
      if (ts.isCallExpression(e) && /object$/.test(e.expression.getText(sf)) && e.arguments[0] && ts.isObjectLiteralExpression(e.arguments[0])) obj = e.arguments[0];
    }
    ts.forEachChild(n, findSchema);
  };
  findSchema(sf);
  if (!obj) return null;
  return obj.properties.filter((p) => p.name).map((p) => p.name.getText(sf).replace(/['"]/g, ''));
}

function methodFromOpts(opts, sf) {
  if (!opts || !ts.isObjectLiteralExpression(opts)) return null;
  const m = opts.properties.find((p) => p.name && p.name.getText(sf) === 'method');
  if (!m || !ts.isPropertyAssignment(m)) return null;
  const v = m.initializer;
  return ts.isStringLiteralLike(v) ? v.text.toUpperCase() : 'DYNAMIC';
}
function bodyFromOpts(opts, sf) {
  const b = opts.properties.find((p) => p.name && p.name.getText(sf) === 'body');
  if (!b) return { keys: [], spread: false, unresolved: 'no-body' };
  if (ts.isShorthandPropertyAssignment(b)) return bodyKeys(b.name, sf);
  return bodyKeys(b.initializer, sf);
}

/**
 * Admin transport: admin/src/utils/api.ts toBffUrl → /api/admin/<path>, then the
 * BFF (admin/src/pages/api/admin/[...path].ts apiPath) picks the backend path.
 * Mirrors both so admin calls are checked against the route they really hit.
 */
function adminBackendPath(url) {
  let u = url;
  if (u.startsWith('/api/v1/admin/')) u = '/api/admin/' + u.slice('/api/v1/admin/'.length);
  else if (u.startsWith('/admin/')) u = '/api/admin/' + u.slice('/admin/'.length);
  else if (!u.startsWith('/api/')) u = '/api/admin' + u;
  if (!u.startsWith('/api/admin/')) return null; // other Next API routes (auth, impersonation BFFs)
  const d = u.slice('/api/admin/'.length).split('/').filter(Boolean);
  const rest = (n) => d.slice(n).join('/');
  let up = '/admin/' + d.join('/');
  const modulePrefixes = new Set(['support', 'medicines', 'storage', 'insurance', 'emergency', 'legal', 'ai', 'labs', 'radiology', 'nursing']);
  if (d[0] === 'orders') up = '/admin/' + d.join('/');
  else if (d[0] === 'providers') up = d[1] === 'provider-deltas' ? '/providers/provider-deltas' + (rest(2) ? '/' + rest(2) : '') : '/admin/providers' + (rest(1) ? '/' + rest(1) : '');
  else if (modulePrefixes.has(d[0])) {
    const stayAdmin = (d[0] === 'insurance' && (d[1] === 'stats' || d[1] === 'requests')) || (d[0] === 'nursing' && d[1] === 'requests');
    up = stayAdmin ? '/admin/' + d.join('/') : '/' + d.join('/');
  }
  if (d[0] === 'ambulance' && d[1] === 'fleet') up = '/admin/ambulance/fleet' + (rest(2) ? '/' + rest(2) : '');
  if (d[0] === 'locations' && d.length > 1) up = '/locations/' + rest(1);
  for (const m of ['community', 'loyalty', 'auth', 'support-session', 'system-health']) if (d[0] === m) up = `/${m}/` + rest(1);
  if (d[0] === 'chat' || d[0] === 'chats') up = `/${d[0]}/` + rest(1);
  if (d[0] === 'search' && d[1] === 'intent') up = '/search/intent';
  if (d[0] === 'provider-onboarding' && d[1] === 'admin') up = '/provider-onboarding/admin/' + rest(2);
  if (d[0] === 'nabd-extensions' && d[1] === 'admin') up = '/nabd-extensions/admin/' + rest(2);
  return up.replace(/\/+$/, '');
}

// --types: type every body field with the app's own TypeScript program (checker), so dtocheck can
// compare value kinds (string/number/boolean/array/object) with the DTO's class-validator decorators.
const WITH_TYPES = process.argv.includes('--types');
const programs = new Map();
function programFor(file) {
  const root = ['admin', 'provider-app', 'patient-web', 'patient-app'].find((r) => file.startsWith(r + '/'));
  if (!root) return null;
  if (!programs.has(root)) {
    const cfgPath = path.resolve(root, 'tsconfig.json');
    const cfg = ts.getParsedCommandLineOfConfigFile(cfgPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
    programs.set(root, cfg ? ts.createProgram({ rootNames: cfg.fileNames, options: { ...cfg.options, noEmit: true } }) : null);
  }
  return programs.get(root);
}
function kindOf(t, checker) {
  if (!t) return null;
  const F = ts.TypeFlags;
  if (t.flags & (F.Any | F.Unknown)) return null;
  if (t.isUnion && t.isUnion()) {
    const ks = [...new Set(t.types.filter((x) => !(x.flags & (F.Undefined | F.Null | F.Void))).map((x) => kindOf(x, checker)))];
    if (ks.includes(null)) return null;
    return ks.length === 1 ? ks[0] : (ks.length ? ks.sort().join('|') : 'null');
  }
  if (t.flags & (F.String | F.StringLiteral | F.TemplateLiteral | F.StringMapping)) return 'string';
  if (t.flags & (F.Number | F.NumberLiteral | F.BigInt)) return 'number';
  if (t.flags & (F.Boolean | F.BooleanLiteral)) return 'boolean';
  if (t.flags & (F.Null | F.Undefined)) return 'null';
  if (checker.isArrayType(t) || checker.isTupleType(t)) {
    const el = checker.isArrayType(t) ? (checker.getTypeArguments(t) || [])[0] : null;
    const ek = el ? kindOf(el, checker) : null;
    return ek && ek !== 'null' && !ek.includes('|') && !ek.startsWith('array') ? `array<${ek}>` : 'array';
  }
  const sym = t.getSymbol && t.getSymbol();
  if (sym && sym.getName() === 'Date') return 'string'; // JSON.stringify(Date) -> ISO string
  if (t.flags & F.Object) return 'object';
  return null;
}
function bodyKinds(expr, sf, checker) {
  while (expr && (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr))) expr = expr.expression;
  if (expr && ts.isCallExpression(expr) && /JSON\.stringify$/.test(expr.expression.getText(sf))) expr = expr.arguments[0];
  if (!expr) return null;
  const t = checker.getTypeAtLocation(expr);
  if (!t || (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))) return null;
  const out = {};
  for (const p of checker.getPropertiesOfType(t)) {
    const decl = p.valueDeclaration || (p.declarations || [])[0];
    const pt = decl ? checker.getTypeOfSymbolAtLocation(p, decl) : checker.getTypeOfSymbol(p);
    out[p.getName()] = kindOf(pt, checker);
  }
  return out;
}
function bodyExprOfOpts(opts, sf) {
  const b = opts && opts.properties.find((p) => p.name && p.name.getText(sf) === 'body');
  if (!b) return null;
  return ts.isShorthandPropertyAssignment(b) ? b.name : b.initializer;
}

// Wrapper resolution: `step3(payload) { return client.post('/x', payload) }` -> type each caller's argument.
const callIndex = new Map(); // program -> Map(symbol -> CallExpression[])
function callersOf(prog, checker, fnSym) {
  if (!callIndex.has(prog)) {
    const idx = new Map();
    for (const f of prog.getSourceFiles()) {
      if (f.isDeclarationFile || f.fileName.includes('node_modules')) continue;
      const v = (n) => {
        if (ts.isCallExpression(n)) {
          let sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(n.expression) ? n.expression.name : n.expression);
          if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
          // keyed by declaration node: the symbol seen at a use site can differ from the declaration's
          for (const d of (sym && sym.declarations) || []) { if (!idx.has(d)) idx.set(d, []); idx.get(d).push(n); }
        }
        ts.forEachChild(n, v);
      };
      v(f);
    }
    callIndex.set(prog, idx);
  }
  return (fnSym.declarations || []).flatMap((d) => callIndex.get(prog).get(d) || []);
}
function wrapperParam(expr, checker) {
  if (!expr || !ts.isIdentifier(expr)) return null;
  const sym = checker.getSymbolAtLocation(expr);
  const decl = sym && sym.valueDeclaration;
  if (!decl || !ts.isParameter(decl)) return null;
  const fn = decl.parent;
  const index = fn.parameters.indexOf(decl);
  let fnSym = null;
  if ((ts.isMethodDeclaration(fn) || ts.isFunctionDeclaration(fn)) && fn.name) fnSym = checker.getSymbolAtLocation(fn.name);
  else if ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && fn.parent && (ts.isVariableDeclaration(fn.parent) || ts.isPropertyAssignment(fn.parent)) && fn.parent.name) fnSym = checker.getSymbolAtLocation(fn.parent.name);
  return fnSym ? { fnSym, index } : null;
}
const viaWrappers = [];

const out = [];
for (const app of APPS) {
  for (const f of walk(app)) {
    const prog = WITH_TYPES ? programFor(f) : null;
    const checker = prog ? prog.getTypeChecker() : null;
    const sf = (prog && prog.getSourceFile(path.resolve(f))) || ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const typed = !!(checker && prog.getSourceFile(path.resolve(f)));
    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression.getText(sf);
        const a = n.arguments;
        let rec = null;
        const verbMatch = callee.match(/\.(post|put|patch|delete)$/i);
        if (verbMatch && a[0]) {
          const url = urlOf(a[0], sf);
          if (url) rec = { method: verbMatch[1].toUpperCase(), url, ...bodyKeys(a[1], sf) };
        } else if (a[0] && ts.isConditionalExpression(a[0])) {
          // apiFetch(editing ? `/x/${id}` : '/x', { method: editing ? 'PATCH' : 'POST', body }) -> one record per branch
          const opts = a.find((x) => ts.isObjectLiteralExpression(x));
          const m = opts && opts.properties.find((p) => p.name && p.name.getText(sf) === 'method');
          const mc = m && ts.isPropertyAssignment(m) && ts.isConditionalExpression(m.initializer) ? m.initializer : null;
          if (mc && mc.condition.getText(sf) === a[0].condition.getText(sf)) {
            for (const [u, v] of [[a[0].whenTrue, mc.whenTrue], [a[0].whenFalse, mc.whenFalse]]) {
              const url = urlOf(u, sf);
              if (url && ts.isStringLiteralLike(v) && v.text.toUpperCase() !== 'GET') {
                let kinds = null;
                if (typed) { try { const e = bodyExprOfOpts(opts, sf); kinds = e ? bodyKinds(e, sf, checker) : null; } catch { kinds = null; } }
                out.push({ method: v.text.toUpperCase(), url, ...bodyFromOpts(opts, sf), kinds, at: `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`, callee, idem: /idempotency/i.test(n.getText(sf)) });
              }
            }
          }
        } else if (a[0]) {
          const url = urlOf(a[0], sf);
          if (url) {
            const opts = a.find((x) => ts.isObjectLiteralExpression(x) && methodFromOpts(x, sf));
            const verbArg = a.find((x) => ts.isStringLiteralLike(x) && VERBS.includes(x.text.toUpperCase()));
            if (opts) {
              const method = methodFromOpts(opts, sf);
              if (method !== 'GET') rec = { method, url, ...bodyFromOpts(opts, sf) };
            } else if (verbArg) {
              const idx = a.indexOf(verbArg);
              rec = { method: verbArg.text.toUpperCase(), url, ...bodyKeys(a[idx + 1], sf) };
            }
          }
        }
        if (rec && app.startsWith('admin/')) {
          const inBff = f.includes('/pages/api/');
          rec.backend = inBff ? rec.url : adminBackendPath(rec.url);
        }
        if (rec && typed) {
          const verbCall = /\.(post|put|patch|delete)$/i.test(callee);
          const expr = verbCall ? a[1] : bodyExprOfOpts(a.find((x) => ts.isObjectLiteralExpression(x) && methodFromOpts(x, sf)), sf);
          try { rec.kinds = expr ? bodyKinds(expr, sf, checker) : null; } catch { rec.kinds = null; }
          const w = !rec.kinds ? wrapperParam(expr, checker) : null;
          if (w) viaWrappers.push({ rec: { ...rec }, w, prog, checker, callee, wat: `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}` });
        }
        if (rec) out.push({ ...rec, at: `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`, callee, idem: /idempotency/i.test(n.getText(sf)) });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}
for (const { rec, w, prog, checker, callee, wat } of viaWrappers) {
  for (const call of callersOf(prog, checker, w.fnSym)) {
    const arg = call.arguments[w.index];
    if (!arg) continue;
    const csf = call.getSourceFile();
    let kinds = null;
    try { kinds = bodyKinds(arg, csf, checker); } catch { kinds = null; }
    const lit = bodyKeys(arg, csf);
    out.push({ ...rec, ...lit, keys: lit.unresolved && kinds ? Object.keys(kinds) : lit.keys, unresolved: lit.unresolved && !kinds ? lit.unresolved : undefined,
      kinds, at: `${path.relative(process.cwd(), csf.fileName)}:${csf.getLineAndCharacterOfPosition(call.getStart()).line + 1}`, callee: `${callee} via ${call.expression.getText(csf)}`, via: wat });
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
