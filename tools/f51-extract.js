// P9 F51 helper: move a top-level function to its own file.
// Usage: node tools/f51-extract.js <file> <FuncName> [newBaseName]
// New file gets the source's import block; the function is exported;
// the source gets a named import. Cross-refs fixed afterwards via f51-fixrefs.
const ts = require('/Users/ahmedobaid/nabd-plus/provider-app/node_modules/typescript');
const fs = require('fs');

const [file, funcName, newBase] = process.argv.slice(2);
const outName = (newBase || funcName) + '.tsx';
const src = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

let node = null;
ts.forEachChild(sf, (n) => {
  if (ts.isFunctionDeclaration(n) && n.name && n.name.text === funcName && n.parent === sf) node = n;
});
if (!node) { console.error('function not found or not top-level: ' + funcName); process.exit(1); }
const text = node.getFullText(sf);

// import block: leading col-0 import statements (incl. continuations)
const lines = src.split('\n');
let impEnd = 0;
let i = 0;
while (i < lines.length) {
  if (/^import(?=\s|['"*\{])/.test(lines[i])) {
    do { impEnd = ++i; } while (i < lines.length && !lines[i - 1].trimEnd().endsWith(';'));
  } else if (!lines[i].trim()) { i++; }
  else break;
}
const imports = lines.slice(0, impEnd).join('\n');
const dir = file.slice(0, file.lastIndexOf('/') + 1);

// export-ize the moved function itself (not leading trivia/comments)
let moved = text.replace(/^\s+/, '');
moved = moved.replace(/^(function\s+\w+)/m, 'export $1');
fs.writeFileSync(dir + outName, imports + '\n\n' + moved.trimEnd() + '\n');

// source: remove function text, add import after import block
const without = src.slice(0, node.getFullStart()) + src.slice(node.getEnd());
const wlines = without.split('\n');
let j = 0;
while (j < wlines.length) {
  if (/^import(?=\s|['"*\{])/.test(wlines[j])) {
    do { j++; } while (j < wlines.length && !wlines[j - 1].trimEnd().endsWith(';'));
  } else if (!wlines[j].trim()) { j++; }
  else break;
}
wlines.splice(j, 0, `import { ${funcName} } from './${outName.slice(0, -4)}';`);
fs.writeFileSync(file, wlines.join('\n'));
console.log(`moved ${funcName} (${node.getEnd() - node.getFullStart()} chars) -> ${outName}`);
