#!/usr/bin/env node
/*
 * Raw collection names read by the backend that nothing writes. A typo'd or stale name
 * (e.g. 'emergencyrequests' while the model writes 'emergency_requests', or the legacy 'orders'
 * while pharmacy orders live in 'pharmacy_orders') makes a dashboard or report silently show 0.
 *
 *   node tools/audit/collections.js        (from repo root; exit 1 when anything is found)
 *
 * Written collections = every Mongoose model's collection (explicit @Schema({collection}) / new Schema(.., {collection})
 * or the model name pluralized the way Mongoose does) + raw conn.collection('x') writes
 * (insert/bulkWrite/replace, and update or findOneAndUpdate with upsert).
 * Read collections = raw conn.collection('x') reads (find*, countDocuments, aggregate, distinct).
 */
const path = require('path');
const fs = require('fs');
const ts = require(path.resolve('backend/node_modules/typescript'));
const pluralize = require(path.resolve('backend/node_modules/mongoose')).pluralize();

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
const str = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null;

// 1) schema class -> explicit collection
const schemaCollection = new Map(); // class name -> collection
const schemaConst = new Map(); // XSchema const -> class name | explicit collection
for (const sf of files) {
  const visit = (n) => {
    if (ts.isClassDeclaration(n) && n.name) {
      for (const d of ts.canHaveDecorators(n) ? ts.getDecorators(n) || [] : []) {
        const e = d.expression;
        if (ts.isCallExpression(e) && /Schema$/.test(e.expression.getText(sf)) && e.arguments[0] && ts.isObjectLiteralExpression(e.arguments[0])) {
          const c = e.arguments[0].properties.find((p) => p.name && p.name.getText(sf) === 'collection' && ts.isPropertyAssignment(p));
          if (c && str(c.initializer)) schemaCollection.set(n.name.text, str(c.initializer));
        }
      }
    }
    if (ts.isVariableDeclaration(n) && n.initializer) {
      let init = n.initializer;
      // SchemaFactory.createForClass(X)  |  new Schema({...}, { collection: 'x' })
      if (ts.isCallExpression(init) && /createForClass$/.test(init.expression.getText(sf)) && init.arguments[0]) {
        schemaConst.set(n.name.getText(sf), { cls: init.arguments[0].getText(sf) });
      } else if (ts.isNewExpression(init) && /Schema$/.test(init.expression.getText(sf))) {
        const opts = init.arguments && init.arguments[1];
        const c = opts && ts.isObjectLiteralExpression(opts) && opts.properties.find((p) => p.name && p.name.getText(sf) === 'collection' && ts.isPropertyAssignment(p));
        schemaConst.set(n.name.getText(sf), { explicit: c ? str(c.initializer) : null });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const written = new Map(); // collection -> first source
const read = new Map(); // collection -> [locations]
const addW = (c, where) => { if (c && !written.has(c)) written.set(c, where); };
const loc = (sf, n) => `${path.relative(process.cwd(), sf.fileName)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;

// 2) models: forFeature({ name, schema }) and connection.model('Name', schema[, 'collection'])
for (const sf of files) {
  const visit = (n) => {
    if (ts.isObjectLiteralExpression(n)) {
      const get = (k) => n.properties.find((p) => p.name && p.name.getText(sf) === k && ts.isPropertyAssignment(p));
      const nameP = get('name'); const schP = get('schema'); const colP = get('collection');
      if (nameP && schP) {
        const modelName = (str(nameP.initializer) || nameP.initializer.getText(sf)).replace(/\.name$/, '');
        const sc = schemaConst.get(schP.initializer.getText(sf)) || {};
        const col = (colP && str(colP.initializer)) || sc.explicit || (sc.cls && schemaCollection.get(sc.cls)) || pluralize(modelName.toLowerCase());
        addW(col, loc(sf, n));
      }
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'model' && str(n.arguments[0])) {
      const sc = n.arguments[1] ? schemaConst.get(n.arguments[1].getText(sf)) || {} : {};
      addW(str(n.arguments[2]) || sc.explicit || (sc.cls && schemaCollection.get(sc.cls)) || pluralize(str(n.arguments[0]).toLowerCase()), loc(sf, n));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// 3) raw conn.collection('x').<op>(...) and `const col = conn.collection('x'); col.<op>`
const WRITE = /^(insertOne|insertMany|bulkWrite|replaceOne)$/;
const UPSERTABLE = /^(updateOne|updateMany|findOneAndUpdate|findOneAndReplace)$/;
const READ = /^(find|findOne|countDocuments|estimatedDocumentCount|aggregate|distinct)$/;
for (const sf of files) {
  const alias = new Map(); // variable/getter -> collection
  const pre = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && ts.isPropertyAccessExpression(n.initializer.expression)
        && n.initializer.expression.name.text === 'collection' && str(n.initializer.arguments[0])) alias.set(n.name.getText(sf), str(n.initializer.arguments[0]));
    if (ts.isGetAccessor(n) && n.body) {
      const ret = n.body.statements.find(ts.isReturnStatement);
      const e = ret && ret.expression;
      if (e && ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'collection' && str(e.arguments[0])) alias.set(`this.${n.name.getText(sf)}`, str(e.arguments[0]));
    }
    ts.forEachChild(n, pre);
  };
  pre(sf);
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const op = n.expression.name.text; const target = n.expression.expression;
      let col = null;
      if (ts.isCallExpression(target) && ts.isPropertyAccessExpression(target.expression) && target.expression.name.text === 'collection') col = str(target.arguments[0]);
      else if (alias.has(target.getText(sf))) col = alias.get(target.getText(sf));
      if (col) {
        const upsert = UPSERTABLE.test(op) && n.arguments.slice(2).some((a) => /upsert\s*:\s*true/.test(a.getText(sf)));
        if (WRITE.test(op) || upsert) addW(col, loc(sf, n));
        else if (READ.test(op) || UPSERTABLE.test(op)) (read.get(col) || read.set(col, []).get(col)).push(`${loc(sf, n)} ${op}`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const dead = [...read.entries()].filter(([c]) => !written.has(c)).sort(([a], [b]) => a.localeCompare(b));
console.log(`== collections read but never written by any model or raw write: ${dead.length}`);
for (const [c, where] of dead) {
  const near = [...written.keys()].filter((w) => w.replace(/[_s]/g, '') === c.replace(/[_s]/g, '') || w.includes(c.replace(/s$/, '')) || c.includes(w.replace(/s$/, '')));
  console.log(`  ${c}${near.length ? `   (written: ${near.join(', ')})` : ''}`);
  for (const w of where.slice(0, 6)) console.log(`      ${w}`);
  if (where.length > 6) console.log(`      … ${where.length - 6} more`);
}
process.exit(dead.length ? 1 : 0);
