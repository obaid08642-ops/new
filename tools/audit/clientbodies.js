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
    return { keys: [], spread: false, unresolved: 'var:' + expr.text };
  }
  return { keys: [], spread: false, unresolved: expr.getText(sf).slice(0, 60) };
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

const out = [];
for (const app of APPS) {
  for (const f of walk(app)) {
    const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression.getText(sf);
        const a = n.arguments;
        let rec = null;
        const verbMatch = callee.match(/\.(post|put|patch|delete)$/i);
        if (verbMatch && a[0]) {
          const url = urlOf(a[0], sf);
          if (url) rec = { method: verbMatch[1].toUpperCase(), url, ...bodyKeys(a[1], sf) };
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
        if (rec) out.push({ ...rec, at: `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`, callee });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
