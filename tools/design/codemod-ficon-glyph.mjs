#!/usr/bin/env node
/**
 * One-off codemod behind the web "type-enforced glyph prop" change (F82 script budget): every <FIcon> in patient-web that draws a
 * glyph which is not in the by-name core record gets its outline passed in.
 *
 *   <FIcon icon="tooth" ... />          ->  <FIcon icon="tooth" glyph={FILL_TOOTH} ... />   + import { FILL_TOOTH } from icons/glyphs/tooth
 *   <FIcon icon={row.icon} ... />       ->  <FIconByName icon={row.icon} ... />              (SERVER files only: FIconByName reads the full record)
 *   FillIconName (data typed by name)   ->  FillAnyName                                       (a name may now be core or extra)
 *
 * A data-driven <FIcon> in a CLIENT file is reported, not changed: the server that builds the data must hand the outline down.
 * The result is checked by `tsc` (the mirrored FIconProps requires `glyph` for an extra name) and by tests/fill-glyph-boundary.test.ts.
 *
 *   node tools/design/codemod-ficon-glyph.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const WEB = join(REPO, 'patient-web');
const ts = createRequire(join(WEB, 'package.json'))('typescript');
const DRY = process.argv.includes('--dry');

const fillSource = readFileSync(join(WEB, 'components-next/ui-generated/icons/fill.ts'), 'utf8');
const core = new Set(Object.keys(JSON.parse(fillSource.match(/export const FILL_ICON_PATHS = (\{[\s\S]*?\n\}) as const;/)[1])));
const glyphConst = (n) => `FILL_${n.toUpperCase().replace(/-/g, '_')}`;
const GLYPHS = '@/components-next/ui-generated/icons/glyphs';
const BYNAME = '@/components-next/icons/ficon-by-name';

// linear scan (no backtracking): skips leading whitespace, // lines and /* */ blocks, then looks for the directive
function startsWithUseClient(text) {
  let i = 0;
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text.startsWith('//', i)) { const n = text.indexOf('\n', i); if (n < 0) return false; i = n + 1; }
    else if (text.startsWith('/*', i)) { const e = text.indexOf('*/', i + 2); if (e < 0) return false; i = e + 2; }
    else break;
  }
  return /^["']use client["']/.test(text.slice(i, i + 12));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', 'ui-generated'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
  }
  return out;
}

const report = { literal: 0, byName: 0, clientDataDriven: [], typeRenames: 0 };
for (const file of [...walk(join(WEB, 'app')), ...walk(join(WEB, 'components-next')), ...walk(join(WEB, 'lib'))]) {
  let text = readFileSync(file, 'utf8');
  if (!/\bFIcon\b|\bFillIconName\b/.test(text)) continue;
  const isClient = startsWithUseClient(text);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = []; const needGlyphs = new Set(); let needByName = false;
  const visit = (node) => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText() === 'FIcon') {
      const attr = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === 'icon');
      let literal = null;
      if (attr && attr.initializer) {
        const init = attr.initializer;
        if (ts.isStringLiteral(init)) literal = init.text;
        else if (ts.isJsxExpression(init) && init.expression && (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression))) literal = init.expression.text;
      }
      const hasGlyph = node.attributes.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === 'glyph');
      if (literal !== null && !core.has(literal) && !hasGlyph) {
        edits.push({ at: attr.end, text: ` glyph={${glyphConst(literal)}}` }); needGlyphs.add(glyphConst(literal)); report.literal++;
      } else if (literal === null && attr && !hasGlyph) {
        if (isClient) report.clientDataDriven.push(`${relative(WEB, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        else {
          edits.push({ at: node.tagName.getStart(), end: node.tagName.getEnd(), text: 'FIconByName' });
          if (ts.isJsxOpeningElement(node)) { const closing = node.parent.closingElement; edits.push({ at: closing.tagName.getStart(), end: closing.tagName.getEnd(), text: 'FIconByName' }); }
          needByName = true; report.byName++;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  // names typed as FillIconName may now be extra names too
  const renames = [];
  const idVisit = (node) => {
    if (ts.isIdentifier(node) && node.text === 'FillIconName') renames.push(node);
    ts.forEachChild(node, idVisit);
  };
  idVisit(sf);
  const fillImport = sf.statements.find((s) => ts.isImportDeclaration(s) && /ui-generated\/icons\/fill['"]$/.test(s.moduleSpecifier.getText()));
  if (fillImport && renames.length) {
    // only when this file's FillIconName is the one of icons/fill (not a local type of the same name)
    for (const n of renames) edits.push({ at: n.getStart(), end: n.getEnd(), text: 'FillAnyName' });
    report.typeRenames += renames.length;
  }
  if (!edits.length) continue;
  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) text = text.slice(0, e.at) + e.text + text.slice(e.end ?? e.at);
  // imports
  const add = [];
  for (const c of [...needGlyphs].sort()) add.push(`import { ${c} } from "${GLYPHS}/${c.slice(5).toLowerCase().replace(/_/g, '-')}";`);
  if (needByName) add.push(`import { FIconByName } from "${BYNAME}";`);
  if (add.length) {
    const sf2 = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = sf2.statements.filter((s) => ts.isImportDeclaration(s));
    const last = imports[imports.length - 1];
    const pos = last ? last.end : 0;
    text = text.slice(0, pos) + (last ? '\n' : '') + add.join('\n') + (last ? '' : '\n') + text.slice(pos);
  }
  // FillAnyName must be imported where FillIconName was
  if (renames.length && fillImport) text = text.replace(/\bFillIconName\b/g, 'FillAnyName');
  // an FIcon import left unused (everything became FIconByName)
  if (needByName && !/<FIcon\b|\bFIcon\(/.test(text)) {
    text = text.replace(/import\s*\{\s*FIcon\s*\}\s*from\s*["'][^"']*FIcon["'];?\n/, '').replace(/\bFIcon,\s*/, '').replace(/,\s*FIcon\b/, '');
  }
  if (!DRY) writeFileSync(file, text);
}
console.log(JSON.stringify({ ...report, clientDataDriven: report.clientDataDriven }, null, 1));
