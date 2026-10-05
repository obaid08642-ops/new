#!/usr/bin/env node
/**
 * `no-literal-ui-string`: owner rule (2026-10-06), same strictness as `no-raw-color`.
 *
 *   No user-visible text is written directly in a screen or component. Every button label, field label,
 *   placeholder, error, toast, empty state, accessibility label (accessibilityLabel / aria-label), alt text,
 *   page title and meta tag comes from the translation files (patient-web/messages/*.json,
 *   patient-app/src/i18n/locales/*.json), in all six languages.
 *
 * This is a RATCHET like client-token-sync: the debt that existed when the rule landed is recorded per file in
 * `no-literal-ui-string.baseline.json`; the check fails when a file gets more literals than its entry or an
 * unlisted file has any; `--update` only ever LOWERS the baseline. Every screen a PR touches must end with zero
 * (the PR description states the new total, as with colours): `--changed <git-ref>` lists the literals left in
 * the files changed since that ref and fails if there are any.
 *
 * WHAT COUNTS (each occurrence is one literal, found with the TypeScript parser, not a regex):
 *   - JSX text with a letter in it:                   <Text>Save</Text>
 *   - a string/template in a JSX child expression:    {open ? 'Open' : 'Closed'}
 *   - a string in a text-carrying JSX attribute:      placeholder, title, label, alt, aria-label, aria-description,
 *                                                     accessibilityLabel, accessibilityHint, and the usual
 *                                                     component props (subtitle, description, emptyTitle, ...)
 *   - a text-carrying property of an object literal:  { label: 'Home', title: '...', description: '...' }
 *   - a message passed to the notifiers:              Alert.alert('...'), toast/showToast/setError(...)
 *   - the argument of the old phrase translators:     tr('عربي'), autoTranslate('...') (the key must be an id)
 * WHAT DOES NOT: a string with no letter (numbers, punctuation, symbols), identifier-like lowercase tokens
 * ("close", "primary"), brand names and language names written in their own language (BRAND_ALLOWED), strings
 * in test/fixture/story files, in generated mirrors and in the translation files themselves, and a line (or the
 * line before it) that carries `// i18n-ok: <reason>`.
 *
 * Usage:
 *   node tools/design/no-literal-ui-string.mjs [--update] [--changed <ref>] [--list <path-substring>]
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const BASELINE_PATH = join(HERE, 'no-literal-ui-string.baseline.json');
const require = createRequire(import.meta.url);
const ts = (() => {
  for (const base of ['packages/design-tokens', 'patient-web', 'patient-app', 'packages/ui', 'admin']) {
    try { return require(join(REPO, base, 'node_modules/typescript')); } catch { /* next */ }
  }
  throw new Error('no-literal-ui-string: typescript is not installed in any client (run npm install in packages/design-tokens)');
})();

const argv = process.argv.slice(2);
const UPDATE = argv.includes('--update');
const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const CHANGED = arg('--changed');
const LIST = arg('--list');

/** The clients whose screens must not carry text. provider-app and admin are out of scope (owner: app and web). */
const ROOTS = [
  { dir: 'patient-web/app', ts: true },
  { dir: 'patient-web/components-next', ts: false },
  { dir: 'patient-app/app', ts: true },
  { dir: 'patient-app/src', ts: false },
];
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__', '__mocks__', '__snapshots__', 'fixtures', 'stories', 'i18n', 'locales', 'messages', 'ui-generated', 'design-tokens', 'assets', 'public']);
const SKIP_FILE = /(\.test\.|\.spec\.|\.stories\.|\.d\.ts$|fixtures?\.|\.mock\.)/;

/** Brand names and the six languages' own names: written the same in every language. */
const BRAND_ALLOWED = new Set([
  'nabd+', 'nabd', 'nabd plus', 'نبض', 'نبض+', 'نبض بلس', 'apple', 'google', 'x', 'snapchat', 'facebook', 'whatsapp', 'visa', 'mastercard', 'mada', 'apple pay', 'stc pay',
  'العربية', 'english', 'اردو', 'اُردو', 'हिन्दी', 'filipino', 'বাংলা', 'tagalog',
]);

const TEXT_ATTRS = new Set([
  'placeholder', 'title', 'label', 'alt', 'aria-label', 'aria-description', 'aria-placeholder', 'aria-roledescription', 'accessibilityLabel', 'accessibilityHint', 'accessibilityValue',
  'subtitle', 'description', 'caption', 'heading', 'hint', 'helperText', 'errorText', 'errorMessage', 'emptyTitle', 'emptySubtitle', 'emptyBody', 'emptyText', 'message', 'text', 'body',
  'confirmText', 'cancelText', 'buttonText', 'buttonLabel', 'actionLabel', 'retryLabel', 'secondaryActionLabel', 'primaryLabel', 'headerTitle', 'tabBarLabel',
]);
const TEXT_PROPS = new Set(['label', 'title', 'subtitle', 'description', 'placeholder', 'text', 'message', 'hint', 'caption', 'heading', 'emptyTitle', 'emptyBody', 'emptyText', 'body', 'cta', 'buttonText', 'errorText', 'tabBarLabel', 'headerTitle', 'text1', 'text2']);
const NOTIFY_CALLEES = /^(Alert\.alert|toast(\.\w+)?|showToast|Toast\.show|setError|setErrorMessage|setMessage|setStatusMessage|setNotice|setToast|setFeedback|tr|autoTranslate)$/;

const hasLetter = (s) => /\p{L}/u.test(s);
/** Is this string user-facing text (not an id, a number, a brand name)? */
function isText(raw) {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s || !hasLetter(s)) return false;
  if (BRAND_ALLOWED.has(s.toLowerCase())) return false;
  if (/^https?:\/\//i.test(s) || /^[\w.+-]+@[\w.-]+\.\w+$/.test(s)) return false; // URL, email
  if (/^[a-z0-9_.:/#?&=%+-]+$/.test(s)) return false; // id-like lowercase token: "close", "primary", "/orders"
  if (/^[A-Z0-9_]+$/.test(s) && s.length <= 6) return false; // codes: "SAR", "PDF", "OTP"
  if (/^[\w-]+\.[\w.-]+$/.test(s)) return false; // dotted key: "pd.rx_required"
  return true;
}

function literalsOf(node, sf) {
  // every string-ish value reachable through ternaries, logical operators, parentheses, templates
  const out = [];
  const visit = (n) => {
    if (!n) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n);
    else if (ts.isTemplateExpression(n)) out.push(n);
    else if (ts.isConditionalExpression(n)) { visit(n.whenTrue); visit(n.whenFalse); }
    else if (ts.isBinaryExpression(n)) { visit(n.left); visit(n.right); }
    else if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n)) visit(n.expression);
  };
  visit(node);
  return out;
}
const textOf = (n) => {
  if (ts.isTemplateExpression(n)) return [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ');
  return n.text;
};

function scan(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = text.split('\n');
  const found = [];
  const exempt = (line) => /i18n-ok:/.test(lines[line] ?? '') || /i18n-ok:/.test(lines[line - 1] ?? '');
  const add = (n, what, value) => {
    const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
    if (exempt(line)) return;
    found.push({ line: line + 1, what, value: String(value).replace(/\s+/g, ' ').trim().slice(0, 60) });
  };
  const addIfText = (n, what) => { if (isText(textOf(n))) add(n, what, textOf(n)); };

  const walk = (n) => {
    if (ts.isJsxText(n)) {
      const t = n.text.replace(/&nbsp;|&amp;|&[a-z]+;/g, ' ');
      if (isText(t)) add(n, 'jsx-text', t);
    } else if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      for (const lit of literalsOf(n.expression, sf)) addIfText(lit, 'jsx-expression');
    } else if (ts.isJsxAttribute(n) && n.initializer) {
      const name = n.name.getText(sf);
      if (TEXT_ATTRS.has(name)) {
        if (ts.isStringLiteral(n.initializer)) addIfText(n.initializer, `attr ${name}`);
        else if (ts.isJsxExpression(n.initializer) && n.initializer.expression) for (const lit of literalsOf(n.initializer.expression, sf)) addIfText(lit, `attr ${name}`);
      }
    } else if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))) {
      const name = n.name.text;
      if (TEXT_PROPS.has(name)) for (const lit of literalsOf(n.initializer, sf)) addIfText(lit, `prop ${name}`);
    } else if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf);
      if (NOTIFY_CALLEES.test(callee)) {
        for (const a of n.arguments) for (const lit of literalsOf(a, sf)) addIfText(lit, `call ${callee}`);
        if (callee === 'Alert.alert') {
          const buttons = n.arguments[2];
          if (buttons && ts.isArrayLiteralExpression(buttons)) for (const b of buttons.elements) if (ts.isObjectLiteralExpression(b)) for (const p of b.properties) if (ts.isPropertyAssignment(p) && p.name.getText(sf) === 'text') for (const lit of literalsOf(p.initializer, sf)) addIfText(lit, 'alert button');
        }
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return found;
}

function* files(dir, tsToo) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) yield* files(full, tsToo); continue; }
    const ext = extname(name);
    if ((ext === '.tsx' || (tsToo && ext === '.ts')) && !SKIP_FILE.test(name)) yield full;
  }
}

const result = {};
const details = {};
for (const root of ROOTS) {
  for (const f of files(join(REPO, root.dir), root.ts)) {
    const rel = relative(REPO, f).split(sep).join('/');
    const found = scan(f, readFileSync(f, 'utf8'));
    if (found.length) { result[rel] = found.length; details[rel] = found; }
  }
}
const total = Object.values(result).reduce((a, b) => a + b, 0);

if (LIST) {
  for (const [f, items] of Object.entries(details)) if (f.includes(LIST)) for (const i of items) console.log(`${f}:${i.line}  ${i.what}  "${i.value}"`);
  process.exit(0);
}

if (CHANGED) {
  const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', CHANGED, '--'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean);
  const left = changed.filter((f) => details[f]);
  if (!left.length) { console.log(`no-literal-ui-string: the ${changed.length} file(s) changed since ${CHANGED} carry no literal UI text.`); process.exit(0); }
  console.error('no-literal-ui-string: files changed in this PR still carry literal UI text (the rule is zero in every file you touch):');
  for (const f of left) for (const i of details[f].slice(0, 12)) console.error(`  ${f}:${i.line}  ${i.what}  "${i.value}"`);
  process.exit(1);
}

const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
if (!baseline && !UPDATE) { console.error('no-literal-ui-string: no baseline. Run with --update once.'); process.exit(2); }
const base = baseline?.files ?? {};
const baseTotal = Object.values(base).reduce((a, b) => a + b, 0);

if (UPDATE) {
  const next = {};
  for (const [f, n] of Object.entries(result)) next[f] = baseline ? Math.min(n, base[f] ?? n) : n; // only ever lowers
  for (const f of Object.keys(next)) if (baseline && !(f in base)) delete next[f]; // a new file with literals is a failure, never recorded
  const raised = baseline ? Object.entries(result).filter(([f, n]) => n > (base[f] ?? 0)) : [];
  if (raised.length) { console.error('no-literal-ui-string: refusing to raise the baseline:'); for (const [f, n] of raised.slice(0, 20)) console.error(`  ${f}: ${base[f] ?? 0} -> ${n}`); process.exit(1); }
  const out = { note: 'Literal UI strings per file (patient-web, patient-app). Ratcheted: --update only ever lowers it. Rule: owner 2026-10-06, see QUALITY_STANDARDS.md section 8.', files: Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + '\n');
  const t = Object.values(out.files).reduce((a, b) => a + b, 0);
  console.log(`no-literal-ui-string: ${baseline ? `baseline ${baseTotal} -> ${t}` : `recorded ${t}`} literal(s) in ${Object.keys(out.files).length} file(s).`);
  process.exit(0);
}

const worse = Object.entries(result).filter(([f, n]) => n > (base[f] ?? 0));
if (worse.length) {
  console.error('no-literal-ui-string: FAILED. User-visible text must come from the translation files (patient-web/messages, patient-app/src/i18n/locales), in all six languages:');
  for (const [f] of worse.slice(0, 15)) for (const i of details[f].slice(0, 5)) console.error(`  ${f}:${i.line}  ${i.what}  "${i.value}"`);
  console.error(`  (${worse.length} file(s) over their baseline; list them with --list <path>)`);
  process.exit(1);
}
const clean = Object.keys(base).filter((f) => !(f in result));
console.log(`no-literal-ui-string: no new literal UI text. ${total} remain (baseline ${baseTotal}) in ${Object.keys(result).length} file(s).${clean.length ? ` ${clean.length} baselined file(s) are now clean: run --update to lower it.` : ''} PARTIAL: rebuilt screens clear their own.`);
