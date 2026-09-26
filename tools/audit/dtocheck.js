#!/usr/bin/env node
/*
 * P3.1 safety net. With ValidationPipe({ whitelist, forbidNonWhitelisted })
 * a DTO that misses a field a client sends turns that call into a 400, and a
 * required field a client never sends does the same. This joins
 *   - backend routes whose @Body() is a DTO class (props + required-ness), and
 *   - client write calls (tools/audit/clientbodies.js output)
 * and prints every mismatch. Exit 1 when any is found.
 *
 *   node tools/audit/clientbodies.js > /tmp/clients.json   (import-aware: resolves same-named DTO classes per controller file)
 *   node tools/audit/dtocheck.js /tmp/clients.json   (import-aware: resolves same-named DTO classes per controller file) [module-path-substring]
 */
const path = require('path');
const fs = require('fs');
const ts = require(path.resolve('backend/node_modules/typescript'));

const ROOT = path.resolve('backend/src');
const clients = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
// Optional module filter: a plain path substring (not a regex).
const filterText = process.argv[3] || '';
const filter = { test: (p) => p.includes(filterText) };

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}
const sources = walk(ROOT).map((f) => ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true));
const decos = (n) => (ts.canHaveDecorators(n) ? ts.getDecorators(n) || [] : []);
const dName = (d) => { const e = d.expression; return ts.isCallExpression(e) ? e.expression.getText() : e.getText(); };
const dArg = (d) => {
  const e = d.expression;
  if (!ts.isCallExpression(e) || !e.arguments[0]) return '';
  const a = e.arguments[0];
  if (ts.isStringLiteralLike(a)) return a.text;
  if (ts.isArrayLiteralExpression(a)) return a.elements.filter(ts.isStringLiteralLike).map((x) => x.text)[0] || '';
  return '';
};

// Value kind a property's class-validator decorators accept (no implicit conversion in the pipe):
// 'string' | 'number' | 'boolean' | 'array' | 'object' | 'array|string' (each:true on a scalar check) | null (any).
const kindsOf = new Map();
const STRING_DECOS = new Set(['IsString', 'IsEmail', 'IsUUID', 'IsDateString', 'IsISO8601', 'IsUrl', 'IsMongoId', 'IsPhoneNumber', 'Matches', 'IsNumberString', 'IsAlphanumeric', 'IsHexColor', 'IsLatLong', 'IsMobilePhone', 'IsIBAN', 'IsJWT', 'IsBase64', 'Length', 'MinLength', 'MaxLength', 'Contains']);
const NUMBER_DECOS = new Set(['IsNumber', 'IsInt', 'IsPositive', 'IsNegative', 'Min', 'Max', 'IsLatitude', 'IsLongitude', 'IsDivisibleBy']);
function expectedKind(ds, sf) {
  const names = ds.map(dName);
  const each = (d) => /each\s*:\s*true/.test(d.getText(sf));
  if (names.includes('IsArray') || names.includes('ArrayMinSize') || names.includes('ArrayMaxSize') || names.includes('ArrayNotEmpty')) {
    const eachOf = (set) => ds.some((d) => set.has(dName(d)) && each(d));
    if (eachOf(STRING_DECOS)) return 'array<string>';
    if (eachOf(NUMBER_DECOS)) return 'array<number>';
    if (ds.some((d) => dName(d) === 'IsBoolean' && each(d))) return 'array<boolean>';
    if (ds.some((d) => ['IsObject', 'ValidateNested'].includes(dName(d)) && each(d))) return 'array<object>';
    return 'array';
  }
  if (names.includes('IsBoolean')) return ds.some((d) => dName(d) === 'IsBoolean' && each(d)) ? 'array|boolean' : 'boolean';
  const num = ds.find((d) => NUMBER_DECOS.has(dName(d)));
  const str = ds.find((d) => STRING_DECOS.has(dName(d)));
  if (num && !str) return each(num) ? 'array|number' : 'number';
  if (str && !num) return each(str) ? 'array|string' : 'string';
  if (names.includes('IsObject') || (names.includes('ValidateNested') && !names.includes('IsArray'))) return 'object';
  return null; // IsIn / IsEnum / IsDefined / Allow / IsNotEmpty: value kind not constrained here
}
function kindsFor(name, seen = new Set()) {
  const c = classes.get(name);
  if (!c || seen.has(name)) return new Map();
  seen.add(name);
  const key = [...classes.entries()].find(([, v]) => v === c)[0];
  const cls = key.includes('#') ? key : null;
  const out = c.ext ? heritageKinds(c.ext, c.sf, seen) : new Map();
  for (const [prop] of c.props) {
    const k = kindsOf.get(`${c.sf.fileName}#${c.name}.${prop}`);
    out.set(prop, k === undefined ? null : k);
  }
  return out;
}
function heritageKinds(expr, sf, seen) {
  expr = unwrap(expr);
  if (!expr) return new Map();
  if (ts.isIdentifier(expr)) return kindsFor(resolveIn(sf, expr.text), seen);
  if (ts.isCallExpression(expr)) { const out = new Map(); for (const a of expr.arguments) for (const [k, v] of heritageKinds(a, sf, seen)) out.set(k, v); return out; }
  return new Map();
}

// DTO classes: name -> { props: Map(name -> required), heritage expr }
const classes = new Map();
for (const sf of sources) {
  const visit = (n) => {
    if (ts.isClassDeclaration(n) && n.name) {
      const props = new Map();
      for (const m of n.members) {
        if (!ts.isPropertyDeclaration(m) || !m.name) continue;
        const ds = decos(m).map(dName);
        if (!ds.length) continue; // undecorated → stripped by whitelist → rejected
        props.set(m.name.getText(sf), !ds.includes('IsOptional') && !ds.includes('ValidateIf') && !m.questionToken);
        kindsOf.set(`${sf.fileName}#${n.name.text}.${m.name.getText(sf)}`, expectedKind(decos(m), sf));
      }
      const ext = (n.heritageClauses || []).find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
      const e={ props, ext: ext ? ext.types[0].expression : null, sf, name: n.name.text }; classes.set(sf.fileName+'#'+n.name.text, e); if(!classes.has(n.name.text)) classes.set(n.name.text, e);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const unwrap = (e) => { while (e && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e))) e = e.expression; return e; };
/** Props of a heritage expression: Identifier | PartialType(x) | PickType(x, [...]) | OmitType(x, [...]) | IntersectionType(a, b). */
function exprProps(expr, sf, seen) {
  expr = unwrap(expr);
  if (!expr) return new Map();
  if (ts.isIdentifier(expr)) return dtoProps(resolveIn(sf, expr.text), seen) || new Map();
  if (ts.isCallExpression(expr)) {
    const fn = expr.expression.getText(sf);
    const keysOf = (a) => { a = unwrap(a); return a && ts.isArrayLiteralExpression(a) ? a.elements.filter(ts.isStringLiteralLike).map((x) => x.text) : []; };
    if (/IntersectionType/.test(fn)) {
      const out = new Map();
      for (const a of expr.arguments) for (const [k, v] of exprProps(a, sf, seen)) out.set(k, v);
      return out;
    }
    const base = exprProps(expr.arguments[0], sf, seen);
    const out = new Map();
    for (const [k, req] of base) {
      if (/OmitType/.test(fn) && keysOf(expr.arguments[1]).includes(k)) continue;
      if (/PickType/.test(fn) && !keysOf(expr.arguments[1]).includes(k)) continue;
      out.set(k, /PartialType/.test(fn) ? false : req);
    }
    return out;
  }
  return new Map();
}
function resolveIn(sf, name) {
  if (classes.has(sf.fileName+'#'+name)) return sf.fileName+'#'+name;
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause || !st.importClause.namedBindings || !ts.isNamedImports(st.importClause.namedBindings)) continue;
    const el = st.importClause.namedBindings.elements.find((x) => x.name.text === name);
    if (!el) continue;
    const orig = (el.propertyName || el.name).text;
    const base = path.resolve(path.dirname(sf.fileName), st.moduleSpecifier.text);
    for (const f of [base + '.ts', base + '/index.ts']) if (classes.has(f + '#' + orig)) return f + '#' + orig;
  }
  return name;
}
function dtoProps(name, seen = new Set()) {
  const c = classes.get(name);
  if (!c || seen.has(name)) return null;
  seen.add(name);
  const props = c.ext ? exprProps(c.ext, c.sf, seen) : new Map();
  for (const [k, v] of c.props) props.set(k, v);
  return props;
}

// Routes with a DTO body.
const routes = [];
for (const sf of sources) {
  const rel = path.relative(ROOT, sf.fileName);
  if (!filter.test(rel)) continue;
  ts.forEachChild(sf, (cls) => {
    if (!ts.isClassDeclaration(cls)) return;
    const ctl = decos(cls).find((d) => dName(d) === 'Controller');
    if (!ctl) return;
    const prefix = dArg(ctl);
    for (const m of cls.members) {
      if (!ts.isMethodDeclaration(m)) continue;
      const verb = decos(m).find((d) => ['Post', 'Put', 'Patch', 'Delete'].includes(dName(d)));
      if (!verb) continue;
      const bodyParam = m.parameters.find((p) => decos(p).some((d) => dName(d) === 'Body' && !dArg(d)));
      if (!bodyParam || !bodyParam.type) continue;
      const tname = bodyParam.type.getText(sf);
      const props = dtoProps(resolveIn(sf, tname));
      if (!props) continue;
      const kinds = kindsFor(resolveIn(sf, tname));
      const full = '/' + [prefix, dArg(verb)].filter(Boolean).join('/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
      const re = new RegExp('^' + full.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$');
      routes.push({ method: dName(verb).toUpperCase(), path: full, re, dto: tname, props, kinds, at: `${rel}:${sf.getLineAndCharacterOfPosition(m.getStart()).line + 1}` });
    }
  });
}

function candidates(c) {
  const u = c.backend || c.url;
  // Client ":x" segments may stand for any literal segment too.
  const all = routes.filter((r) => {
    const cs = u.split('/'); const rs = r.path.split('/');
    if (cs.length !== rs.length) return false;
    return rs.every((seg, i) => seg.startsWith(':') || cs[i] === ':x' || cs[i] === seg);
  });
  // REVIEW-FIX: when the client URL matches a route on every literal segment
  // (params aligning with params), wildcard-only matches against other routes
  // are false positives (e.g. /labs/bookings/:x/documents vs collect-sample/:id).
  // An Express server routes literals deterministically, so exact wins.
  const exact = all.filter((r) => {
    const cs = u.split('/'); const rs = r.path.split('/');
    return rs.every((seg, i) => {
      const param = (s) => s.startsWith(':') || s === ':x';
      if (param(seg) && param(cs[i])) return true;
      return seg === cs[i];
    });
  });
  return exact.length ? exact : all;
}

let problems = 0;
const matched = new Set();
const isExact = (c, r) => {
  const u = c.backend || c.url;
  const cs = u.split('/'); const rs = r.path.split('/');
  if (cs.length !== rs.length) return false;
  const param = (s) => s.startsWith(':') || s === ':x';
  return rs.every((seg, i) => (param(seg) && param(cs[i])) || seg === cs[i]);
};
// A client value kind that the DTO rejects: e.g. boolean sent to @IsString, array to @IsObject.
// 'array' (element kind unknown) matches any array<x>; array<x> vs array<y> must agree.
const oneOk = (k, allowed) => allowed.some((a) => a === k || (a === 'array' && k.startsWith('array')) || (k === 'array' && a.startsWith('array')));
const kindOk = (sent, expected) => {
  if (!sent || !expected || sent === 'null') return true;
  const allowed = expected.split('|');
  return sent.split('|').every((k) => oneOk(k, allowed));
};
// Definite: no sent kind is accepted. Partial overlap (e.g. expo-router params typed string | string[])
// usually works at runtime, so it is listed for review instead of failing the gate.
const overlaps = (sent, expected) => sent.split('|').some((k) => oneOk(k, expected.split('|')));
const typeErrors = (c, r) => Object.entries(c.kinds || {})
  .filter(([k, sent]) => r.props.has(k) && !kindOk(sent, (r.kinds || new Map()).get(k)) && !overlaps(sent, (r.kinds || new Map()).get(k)))
  .map(([k, sent]) => `${k}: sends ${sent}, DTO wants ${(r.kinds || new Map()).get(k)}`);
const typeMaybe = (c, r) => Object.entries(c.kinds || {})
  .filter(([k, sent]) => r.props.has(k) && !kindOk(sent, (r.kinds || new Map()).get(k)) && overlaps(sent, (r.kinds || new Map()).get(k)))
  .map(([k, sent]) => `${k}: may send ${sent}, DTO wants ${(r.kinds || new Map()).get(k)}`);
const fails = (c, r) => {
  const unknown = c.keys.filter((k) => !r.props.has(k) && !/^\[.*\]$/.test(k));
  const missing = (c.spread || c.unresolved) ? [] : [...r.props].filter(([k, req]) => req && !c.keys.includes(k) && !/^\[.*\]$/.test(k)).map(([k]) => k);
  return { unknown, missing, wrong: typeErrors(c, r) };
};
for (const c of clients) {
  const cands = candidates(c).filter((r) => r.method === c.method);
  // The same METHOD+path declared in several files (tools/audit/routes.py --dups): Nest serves only the
  // first registered one, which static analysis cannot tell. Block only when every declaration rejects.
  const exactFiles = new Set(cands.filter((r) => isExact(c, r)).map((r) => r.at.split(':')[0]));
  const dupAccepts = exactFiles.size > 1 && cands.some((r) => { const x = fails(c, r); return isExact(c, r) && !x.unknown.length && !x.missing.length && !x.wrong.length; });
  for (const r of cands) {
    matched.add(r.at);
    const { unknown, missing, wrong } = fails(c, r);
    if ((unknown.length || missing.length || wrong.length) && dupAccepts && isExact(c, r)) {
      console.log(`? ${r.method} ${r.path} [${r.dto} @ ${r.at}] ← ${c.at} duplicate route: this declaration rejects (${[...unknown, ...missing, ...wrong].join(', ')}) but another accepts; confirm which one is served`);
    } else if (unknown.length || missing.length || wrong.length) {
      // REVIEW-FIX: a non-exact (wildcard) route match that fails is ambiguous —
      // the call may target a sibling literal route (e.g. confirm/cancel vs
      // reschedule). Report for hand verification instead of failing the gate;
      // only exact-match failures block.
      if (!isExact(c, r)) {
        console.log(`? ${r.method} ${r.path} [${r.dto}] ← ${c.at} wildcard route match, ambiguous target: verify by hand` + (unknown.length ? ` (keys not in DTO: ${unknown.join(', ')})` : '') + (missing.length ? ` (DTO requires not sent: ${missing.join(', ')})` : '') + (wrong.length ? ` (wrong type: ${wrong.join('; ')})` : ''));
      } else {
        problems++;
        console.log(`✗ ${r.method} ${r.path} [${r.dto} @ ${r.at}] ← ${c.at}` + (unknown.length ? `\n    rejected (not in DTO): ${unknown.join(', ')}` : '') + (missing.length ? `\n    required but not sent: ${missing.join(', ')}` : '') + (wrong.length ? `\n    wrong type: ${wrong.join('; ')}` : ''));
      }
    } else if (typeMaybe(c, r).length) {
      console.log(`? ${r.method} ${r.path} [${r.dto}] ← ${c.at} type may not match: ${typeMaybe(c, r).join('; ')}`);
    } else if (c.unresolved || c.spread) {
      console.log(`? ${r.method} ${r.path} [${r.dto}] ← ${c.at} body not statically resolvable (${c.unresolved || 'spread'}): verify by hand`);
    }
  }
}
console.log(`\n${routes.length} DTO routes checked, ${matched.size} matched by client calls, ${problems} mismatches`);
process.exit(problems ? 1 : 0);
