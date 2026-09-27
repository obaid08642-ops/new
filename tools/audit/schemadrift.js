#!/usr/bin/env node
/*
 * Writes through a Mongoose model to fields its (strict) schema does not declare. Mongoose drops
 * them silently: the request "succeeds", the value is never stored (e.g. pharmacy quote acceptance,
 * web address lines, insurance member id were all lost this way).
 *
 *   node tools/audit/schemadrift.js            (from repo root; exit 1 when anything is found)
 *
 * Model resolution: @InjectModel('Name' | Class.name) constructor params and MongooseModule.forFeature
 * name -> schema pairs; schema props from @Prop declarations (+ timestamps, _id, __v, id).
 * Writes checked: <model>.create({..}) / new <model>({..}) / updateOne|updateMany|findOneAndUpdate|
 * findByIdAndUpdate(filter, { $set|$setOnInsert|$push|$addToSet|$inc|$unset: {..} } | {..}).
 * Raw collection writes (conn.collection('x')) bypass the schema and are not reported.
 */
const path = require('path');
const fs = require('fs');
const ts = require(path.resolve('backend/node_modules/typescript'));

const ROOT = path.resolve('backend/src');
const walk = (d, out = []) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
};
const files = walk(ROOT).map((f) => ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true));
const decos = (n) => (ts.canHaveDecorators(n) ? ts.getDecorators(n) || [] : []);
const dName = (d) => { const e = d.expression; return ts.isCallExpression(e) ? e.expression.getText() : e.getText(); };

// 1) schema classes: name -> { props:Set, strict, file }
const schemas = new Map();
for (const sf of files) {
  const visit = (n) => {
    if (ts.isClassDeclaration(n) && n.name && decos(n).some((d) => /Schema$/.test(dName(d)))) {
      const schemaDeco = decos(n).find((d) => /Schema$/.test(dName(d)));
      const strictOff = /strict\s*:\s*false/.test(schemaDeco.getText(sf));
      const props = new Set(['_id', '__v', 'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);
      for (const m of n.members) if (ts.isPropertyDeclaration(m) && m.name && decos(m).some((d) => dName(d) === 'Prop')) props.add(m.name.getText(sf));
      // `extends` another schema class: inherit its props
      const ext = (n.heritageClauses || []).find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
      // Several schema classes share a name across modules: keep all, a field counts as declared if any has it.
      const entry = { props, strictOff, ext: ext ? ext.types[0].expression.getText(sf) : null, file: path.relative(process.cwd(), sf.fileName) };
      const prev = schemas.get(n.name.text);
      if (!prev) schemas.set(n.name.text, entry);
      else { for (const x of props) prev.props.add(x); prev.strictOff = prev.strictOff || strictOff; prev.file += `, ${entry.file}`; }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const propsOf = (name, seen = new Set()) => {
  const s = schemas.get(name);
  if (!s || seen.has(name)) return null;
  seen.add(name);
  const out = new Set(s.props);
  if (s.ext) for (const p of propsOf(s.ext, seen) || []) out.add(p);
  return out;
};

// 2) model name -> schema class (forFeature { name: X, schema: YSchema }; YSchema = SchemaFactory.createForClass(Y))
const schemaConst = new Map(); // YSchema -> Y
const modelSchema = new Map(); // model name -> Set(Y) (a name can be registered with different schemas per module)
for (const sf of files) {
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && /createForClass$/.test(n.initializer.expression.getText(sf)) && n.initializer.arguments[0]) {
      schemaConst.set(n.name.getText(sf), n.initializer.arguments[0].getText(sf));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
for (const sf of files) {
  const visit = (n) => {
    if (ts.isObjectLiteralExpression(n)) {
      const nameP = n.properties.find((p) => p.name && p.name.getText(sf) === 'name' && ts.isPropertyAssignment(p));
      const schP = n.properties.find((p) => p.name && p.name.getText(sf) === 'schema' && ts.isPropertyAssignment(p));
      if (nameP && schP) {
        let modelName = nameP.initializer.getText(sf).replace(/['"`]/g, '').replace(/\.name$/, '');
        const cls = schemaConst.get(schP.initializer.getText(sf));
        if (cls) { if (!modelSchema.has(modelName)) modelSchema.set(modelName, new Set()); modelSchema.get(modelName).add(cls); }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// 2b) repository classes: `class XRepository { constructor(@InjectModel(Y.name) model) }` -> model Y,
// injected elsewhere as @Inject('XRepository'). Their create/updateOne/updateMany/findOneAndUpdate
// take the same (filter, update) arguments as the model.
const repoModel = new Map();
for (const sf of files) {
  const visit = (n) => {
    if (ts.isClassDeclaration(n) && n.name && /Repository$/.test(n.name.text)) {
      const ctor = n.members.find(ts.isConstructorDeclaration);
      for (const p of (ctor && ctor.parameters) || []) {
        const im = decos(p).find((d) => dName(d) === 'InjectModel');
        const arg = im && im.expression.arguments[0];
        if (arg) repoModel.set(n.name.text, arg.getText(sf).replace(/['"`]/g, '').replace(/\.name$/, ''));
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// 3) per class: this.<field> -> model name (constructor @InjectModel / @Inject('XRepository') params)
const findings = [];
const UPDATE_OPS = new Set(['$set', '$setOnInsert', '$push', '$addToSet', '$inc', '$unset', '$pull', '$min', '$max']);
// computed keys ([k]: v) are dynamic: not checkable statically
const keysOf = (obj, sf) => obj.properties.filter((p) => p.name && !ts.isSpreadAssignment(p) && !ts.isComputedPropertyName(p.name)).map((p) => p.name.getText(sf).replace(/['"`]/g, ''));
for (const sf of files) {
  const visitClass = (cls) => {
    if (!ts.isClassDeclaration(cls)) { ts.forEachChild(cls, visitClass); return; }
    const fieldModel = new Map();
    const ctor = cls.members.find(ts.isConstructorDeclaration);
    for (const p of (ctor && ctor.parameters) || []) {
      if (!p.name) continue;
      const im = decos(p).find((d) => dName(d) === 'InjectModel');
      const inj = decos(p).find((d) => dName(d) === 'Inject');
      let modelName = null;
      if (im && im.expression.arguments[0]) modelName = im.expression.arguments[0].getText(sf).replace(/['"`]/g, '').replace(/\.name$/, '');
      else if (inj && inj.expression.arguments[0]) modelName = repoModel.get(inj.expression.arguments[0].getText(sf).replace(/['"`]/g, '')) || null;
      else if (p.type && repoModel.has(p.type.getText(sf))) modelName = repoModel.get(p.type.getText(sf));
      if (modelName) fieldModel.set(p.name.getText(sf), modelName);
    }
    if (!fieldModel.size) return;
    const report = (field, key, node, how) => {
      const model = fieldModel.get(field);
      const classes = [...(modelSchema.get(model) || new Set([model]))].filter((c) => schemas.has(c));
      if (!classes.length || classes.some((c) => schemas.get(c).strictOff)) return;
      const top = key.split('.')[0];
      if (top.startsWith('$') || classes.some((c) => (propsOf(c) || new Set()).has(top))) return;
      findings.push(`${path.relative(process.cwd(), sf.fileName)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}  ${model}.${how} writes '${top}' (not in ${classes.join('|')} @ ${classes.map((c) => schemas.get(c).file).join(', ')})`);
    };
    const unwrap = (e) => { while (e && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression?.(e))) e = e.expression; return e; };
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isPropertyAccessExpression(n.expression.expression)
          && n.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const field = n.expression.expression.name.text; const op = n.expression.name.text;
        if (fieldModel.has(field)) {
          const a0 = unwrap(n.arguments[0]); const a1 = unwrap(n.arguments[1]);
          if (['create', 'insertMany'].includes(op) && a0 && ts.isObjectLiteralExpression(a0)) {
            for (const k of keysOf(a0, sf)) report(field, k, n, op);
          }
          if (['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate'].includes(op) && a1 && ts.isObjectLiteralExpression(a1)) {
            const upd = a1;
            const ks = keysOf(upd, sf);
            if (ks.some((k) => UPDATE_OPS.has(k))) {
              for (const p of upd.properties) {
                const init = p.name && ts.isPropertyAssignment(p) ? unwrap(p.initializer) : null;
                if (!init || !UPDATE_OPS.has(p.name.getText(sf).replace(/['"`]/g, '')) || !ts.isObjectLiteralExpression(init)) continue;
                for (const k of keysOf(init, sf)) report(field, k, n, `${op} ${p.name.getText(sf)}`);
              }
            } else for (const k of ks) report(field, k, n, op);
          }
        }
      }
      if (ts.isNewExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === ts.SyntaxKind.ThisKeyword
          && fieldModel.has(n.expression.name.text) && n.arguments && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
        for (const k of keysOf(n.arguments[0], sf)) report(n.expression.name.text, k, n, 'new');
      }
      ts.forEachChild(n, visit);
    };
    visit(cls);
  };
  visitClass(sf);
}
const uniq = [...new Set(findings)].sort();
console.log(`== writes to fields the schema does not declare (silently dropped): ${uniq.length}`);
for (const f of uniq) console.log('  ' + f);
process.exit(uniq.length ? 1 : 0);
