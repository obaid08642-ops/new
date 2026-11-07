#!/usr/bin/env node
/**
 * Mirror the @nabd/ui web renderer into patient-web (12.A6 / 12.A7).
 *
 * WHY A MIRROR
 *
 * patient-web cannot import from `packages/`. It was learned the expensive way:
 * the home page's service tiles were rewritten to use A6's `IllustratedIconView`,
 * `tsc --noEmit` passed, and then `next build` failed with
 *
 *     Module not found: Can't resolve '@nabd/ui'
 *     Import map: aliased to relative '../packages/ui/src/index.ts' inside of [project]/
 *
 * Turbopack resolves the alias and then refuses the target, because it is outside
 * the app root. Same wall `sync-token-css.mjs` documents for CSS, and the same
 * answer: the artefact is MIRRORED, generated, committed, and `--check`ed.
 *
 * WHY MIRRORING THE COMPONENT IS SAFE WHERE MIRRORING BY HAND WAS NOT
 *
 * The renderer is copied, not reimplemented. `IllustratedIconView` and the
 * package's own renderer are the same file, so the artwork on a screen and the
 * artwork in the conformance gallery cannot drift — the thing this task exists
 * to prevent. The relative directory layout is preserved so the imports inside
 * the file keep resolving, and its only external dependencies are `react` and
 * `@phosphor-icons/react`, both of which patient-web already has.
 *
 * Usage:
 *   node tools/design/sync-ui-components.mjs           # write
 *   node tools/design/sync-ui-components.mjs --check   # fail if stale
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const CHECK_ONLY = process.argv.includes('--check');

/** Layout is preserved so the relative imports inside the mirrored files work. */
/**
 * `useClient` is added by the MIRROR, not present in the package.
 *
 * `packages/ui` is a library: a consuming app decides whether it is a Server or
 * a Client Component. Inside patient-web, `components-next/ui-generated/` is
 * imported by server-rendered pages, so without the directive Next treats the
 * module as server code and the build dies with the least helpful error there
 * is: `TypeError: (0 , n.createContext) is not a function` while collecting
 * configuration for the route. The directive belongs to the consumer, so it is
 * added here rather than pasted into the package.
 */
const FILES = [
  { from: 'packages/ui/icons/illustrated.ts', to: 'patient-web/components-next/ui-generated/icons/illustrated.ts' },
  { from: 'packages/ui/icons/illustrated-names.ts', to: 'patient-web/components-next/ui-generated/icons/illustrated-names.ts' },
  { from: 'packages/ui/icons/names.ts', to: 'patient-web/components-next/ui-generated/icons/names.ts' },
  { from: 'packages/ui/icons/illustrations.ts', to: 'patient-web/components-next/ui-generated/icons/illustrations.ts' },
  { from: 'packages/ui/src/Icon.tsx', to: 'patient-web/components-next/ui-generated/src/Icon.tsx', useClient: true },
  // The illustrated artwork, loaded on demand by <Icon> (issue #286).
  { from: 'packages/ui/src/Illustrated.tsx', to: 'patient-web/components-next/ui-generated/src/Illustrated.tsx', useClient: true },
  // DEVICE_STANDARD §1 web shells. AppShell holds the rail state, so it is a Client Component.
  { from: 'packages/ui/shells/AppShell.tsx', to: 'patient-web/components-next/ui-generated/shells/AppShell.tsx', useClient: true },
  { from: 'packages/ui/shells/StickyFooter.tsx', to: 'patient-web/components-next/ui-generated/shells/StickyFooter.tsx' },
  { from: 'packages/ui/shells/index.ts', to: 'patient-web/components-next/ui-generated/shells/index.ts' },
  { from: 'packages/ui/shells/shells.css', to: 'patient-web/components-next/ui-generated/shells/shells.css' },
  // handoff §3 shared components (Batch 0 onward): the contract, the icon data and every
  // component file, so a page uses the same renderer the gallery and the board comparisons do.
  // Component files hold state, refs or handlers, so they are Client Components here.
  { from: 'packages/ui/icons/fill.ts', to: 'patient-web/components-next/ui-generated/icons/fill.ts', transform: filterFill },
  // Pharmacy category illustrations: framework-neutral path data (the app draws the same module with react-native-svg).
  { from: 'packages/ui/icons/category-art.ts', to: 'patient-web/components-next/ui-generated/icons/category-art.ts' },
  { from: 'packages/ui/icons/diag-art.ts', to: 'patient-web/components-next/ui-generated/icons/diag-art.ts' },
  { from: 'packages/ui/icons/nav-art.ts', to: 'patient-web/components-next/ui-generated/icons/nav-art.ts' },
  // a specialty's icon is any glyph name (the extra ones are drawn with their outline: see fill-all.ts)
  { from: 'packages/ui/icons/specialty-look.ts', to: 'patient-web/components-next/ui-generated/icons/specialty-look.ts', transform: (body) => body.replace(/\bFillIconName\b/g, 'FillAnyName') },
  { from: 'packages/ui/icons/marks.ts', to: 'patient-web/components-next/ui-generated/icons/marks.ts' },
  { from: 'packages/ui/icons/social-brands.ts', to: 'patient-web/components-next/ui-generated/icons/social-brands.ts' },
  { from: 'packages/ui/icons/social-brands.css', to: 'patient-web/components-next/ui-generated/icons/social-brands.css' },
  { from: 'packages/ui/icons/fill.ts', to: 'patient-web/components-next/ui-generated/icons/fill-all.ts', transform: (body) => makeFillAll(body) },
  { from: 'packages/ui/icons/line.ts', to: 'patient-web/components-next/ui-generated/icons/line.ts' },
  { from: 'packages/ui/components/contract.ts', to: 'patient-web/components-next/ui-generated/components/contract.ts', transform: (body) => mirrorContract(body) },
  // FIcon is NOT a Client Component: it only uses useId, which a Server Component may call, and as a server module the whole
  // outline record (icons/fill.ts) stays out of the browser bundle of every page that draws it from the server (the doctors page
  // is at its script budget).
  { from: 'packages/ui/components/FIcon.tsx', to: 'patient-web/components-next/ui-generated/components/FIcon.tsx', transform: (body) => mirrorFIcon(body) },
  ...['Button', 'Spinner', 'Inputs', 'Controls', 'Surfaces', 'Cards', 'Feedback'].map((name) => ({
    from: `packages/ui/components/${name}.tsx`,
    to: `patient-web/components-next/ui-generated/components/${name}.tsx`,
    useClient: true,
  })),
  // The component sheet (the components are styled by class: the CSP refuses style attributes).
  ...['components.css', 'css/tones.css', 'css/Spinner.css', 'css/FIcon.css', 'css/Button.css', 'css/Controls.css', 'css/Inputs.css', 'css/Surfaces.css', 'css/Cards.css', 'css/Feedback.css'].map((name) => ({
    from: `packages/ui/components/${name}`,
    to: `patient-web/components-next/ui-generated/components/${name}`,
  })),
  // The app's barrel is the package's, without the gallery fixtures (sample data never ships in
  // the app) and with the paths re-rooted at ui-generated/.
  {
    from: 'packages/ui/src/index.ts',
    to: 'patient-web/components-next/ui-generated/index.ts',
    transform: (body) =>
      body
        .split('\n')
        .filter((line) => !/fixtures/.test(line))
        .join('\n')
        .replace(/from '\.\/Icon'/g, "from './src/Icon'")
        .replace(/from '\.\/Illustrated'/g, "from './src/Illustrated'")
        .replace(/from '\.\.\//g, "from './"),
  },
];


/**
 * The web mirror of fill.ts: a CORE record plus type-enforced `glyph` for everything else.
 *
 * `FIcon` used to pick its outline by name at run time, so the whole record (78 outlines, about 8 KB gz) was in every bundle that
 * drew one FIcon from a client component, which includes the shell on every page (issue #286, then the F82 script budget). Now:
 *   - `FILL_ICON_PATHS` / `FillIconName` hold only the CORE glyphs: those named in SERVICE_ICONS, in packages/ui/components/*.tsx
 *     (the components draw them by name themselves) and in tools/design/fill-core.json (what the shell draws);
 *   - every other glyph is `FillExtraName`: `<FIcon icon="tooth" glyph={FILL_TOOTH} />` (one module per glyph: icons/glyphs/tooth.ts)
 *     is REQUIRED for it by the mirrored contract, so a missing glyph is a type error, and the bundler keeps only the outlines a
 *     module imports (icons/glyphs/<name>.ts, one module per glyph: the bundler does not tree-shake the named exports of one big module);
 *   - icons/fill-all.ts is the by-name record of ALL glyphs for server components and data-driven places: no client module may
 *     import it (tests/fill-glyph-boundary.test.ts).
 * The package keeps the full record (native, the gallery and the board comparison read it).
 */
const glyphConst = (name) => `FILL_${name.toUpperCase().replace(/-/g, '_')}`;

function parseFill(source) {
  const record = source.match(/export const FILL_ICON_PATHS = (\{[\s\S]*?\n\}) as const;/);
  if (!record) throw new Error('sync-ui-components: FILL_ICON_PATHS not found in packages/ui/icons/fill.ts');
  const paths = JSON.parse(record[1]);
  return { record, paths };
}
function coreFillNames(source) {
  const { paths } = parseFill(source);
  const names = new Set(JSON.parse(readFileSync(join(REPO, 'tools/design/fill-core.json'), 'utf8')).names);
  for (const m of source.matchAll(/icon: '([a-z0-9-]+)'/g)) names.add(m[1]); // SERVICE_ICONS
  const dir = join(REPO, 'packages/ui/components');
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.tsx')) continue;
    const text = readFileSync(join(dir, f), 'utf8');
    for (const n of Object.keys(paths)) if (new RegExp(`["'\`]${n}["'\`]`).test(text)) names.add(n);
  }
  for (const n of names) if (!(n in paths)) throw new Error(`sync-ui-components: core glyph "${n}" is not in packages/ui/icons/fill.ts`);
  return Object.keys(paths).filter((n) => names.has(n));
}
function filterFill(body) {
  const { record, paths } = parseFill(body);
  const core = coreFillNames(body);
  const extra = Object.keys(paths).filter((n) => !core.includes(n));
  const filtered = Object.fromEntries(core.map((n) => [n, paths[n]]));
  const union = (list) => (list.length ? list.map((n) => `'${n}'`).join(' | ') : 'never');
  return body.replace(
    record[0],
    `// WEB MIRROR: only the ${core.length} CORE glyphs of ${Object.keys(paths).length} are looked up by name (tools/design/sync-ui-components.mjs, tools/design/fill-core.json).\n` +
      `// Any other glyph is drawn with FIcon's \`glyph\` prop (icons/glyphs/<name>.ts), which the mirrored contract requires for it.\n` +
      `export const FILL_ICON_PATHS = ${JSON.stringify(filtered, null, 2)} as const;\n\n` +
      `/** The glyphs that are NOT in FILL_ICON_PATHS: drawn with \`glyph\`, never by name alone. */\n` +
      `export type FillExtraName = ${union(extra)};\n` +
      `/** Every glyph of the set, core or extra. */\n` +
      `export type FillAnyName = FillIconName | FillExtraName;`,
  );
}
/** icons/fill-all.ts: every glyph by name, from the named exports. Server components and data-driven places only. */
function makeFillAll(source) {
  const { paths } = parseFill(source);
  const names = Object.keys(paths);
  return [
    "import type { FillAnyName } from './fill';",
    ...names.map((n) => `import { ${glyphConst(n)} } from './glyphs/${n}';`),
    '',
    '/**',
    ' * Every filled glyph by name. A CLIENT component must never import this file (it would put all outlines in its bundle):',
    ' * a client component imports the named glyphs it draws from ./glyphs/<name> and passes them as FIcon\'s `glyph`. A server',
    ' * component, or a lib that only server code reads, may use this record (tests/fill-glyph-boundary.test.ts holds the line).',
    ' */',
    'export const FILL_ALL_PATHS: Record<FillAnyName, string> = {',
    ...names.map((n) => `  '${n}': ${glyphConst(n)},`),
    '};',
    '',
    'export const fillGlyph = (name: FillAnyName): string => FILL_ALL_PATHS[name];',
    '',
  ].join('\n');
}
/** Replace `from` with `to` in `body`, failing loudly when the package's text moved (a silent miss would ship an unenforced mirror). */
function must(body, from, to, what) {
  if (!body.includes(from)) throw new Error(`sync-ui-components: ${what}: expected text not found: ${from.slice(0, 80)}`);
  return body.replace(from, to);
}

/** The mirrored contract: FIcon takes `icon` by name for a core glyph and REQUIRES `glyph` for any other. Every other component (Button, EmptyState, ListItem...) takes core names only, so a non-core name is a type error there. */
function mirrorContract(body) {
  let out = must(body, "import type { FillIconName, ServiceName, ServiceTone } from '../icons/fill';", "import type { FillExtraName, FillIconName, ServiceName, ServiceTone } from '../icons/fill';", 'contract import');
  const start = out.indexOf('export interface FIconProps extends A11yProps {');
  if (start < 0) throw new Error('sync-ui-components: FIconProps not found in contract.ts');
  const end = out.indexOf('\n}\n', start) + 3;
  const block = out.slice(start, end)
    .replace('export interface FIconProps extends A11yProps {', 'interface FIconBase extends A11yProps {')
    .replace(/\n  icon: FillIconName;\n  \/\*\*[^\n]*\*\/\n  glyph\?: string;/, '');
  const union =
    '\n/** A core glyph is looked up by name; any other glyph is passed as `glyph` (import it from icons/glyphs/<name>): required by the type. */\n' +
    'export type FIconRef = { icon: FillIconName; glyph?: string } | { icon: FillExtraName; glyph: string };\n' +
    'export type FIconProps = FIconBase & FIconRef;\n';
  out = out.slice(0, start) + block + union + out.slice(end);
  return out;
}
/** FIcon: draws `glyph` when given, else the core record; a name that is in neither is a bug (throws outside production). */
function mirrorFIcon(body) {
  let out = must(body, "import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from '../icons/fill';", "import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../icons/fill';", 'FIcon import');
  out = must(out, "  const glyphSize = chip === 'none' ? size : Math.round(size * 0.52);", "  const glyphSize = chip === 'none' ? size : Math.round(size * 0.52);\n  const path = outline ?? FILL_ICON_PATHS[icon as FillIconName];\n  if (path === undefined && process.env.NODE_ENV !== 'production') throw new Error('FIcon: ' + icon + ' is not a core glyph, pass its outline as the glyph prop (icons/glyphs/<name>)');", 'FIcon path');
  return must(out, 'd={outline ?? FILL_ICON_PATHS[icon]}', 'd={path}', 'FIcon d');
}
const banner = (from) => `// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from ${from} by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// \`next build\`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// \`--check\` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.`;

// One module per glyph (icons/glyphs/<name>.ts): the bundler does NOT tree-shake the named exports of one big module, so a client file
// that imported two outlines from a single icons/fill-glyphs.ts shipped all 78 (the route-state boundary put them in every route).
for (const name of Object.keys(parseFill(readFileSync(join(REPO, 'packages/ui/icons/fill.ts'), 'utf8')).paths)) {
  FILES.push({
    from: 'packages/ui/icons/fill.ts',
    to: `patient-web/components-next/ui-generated/icons/glyphs/${name}.ts`,
    transform: (body) => `export const ${glyphConst(name)} = ${JSON.stringify(parseFill(body).paths[name])};\n`,
  });
}

let stale = 0;
for (const file of FILES) {
  const src = join(REPO, file.from);
  const out = join(REPO, file.to);
  if (!existsSync(src)) {
    console.error(`sync-ui-components: missing source ${file.from}`);
    process.exit(2);
  }
  const raw = readFileSync(src, 'utf8');
  const body = file.transform ? file.transform(raw) : raw;
  // A leading `// @ts-nocheck` or shebang must stay first, so the banner is
  // inserted after any leading comment block.
  const lines = body.split('\n');
  let insertAt = 0;
  while (insertAt < lines.length && /^\s*(\/\/|@ts-|['"]use (client|server)|\/\*)/.test(lines[insertAt])) {
    // A leading /* */ block is skipped whole, so the banner never lands inside it.
    if (/^\s*\/\*/.test(lines[insertAt])) {
      while (insertAt < lines.length && !lines[insertAt].includes('*/')) insertAt++;
    }
    insertAt++;
  }
  // CSS has no // comments: the same banner goes in a /* */ block, at the top.
  const isCss = file.from.endsWith('.css');
  const content = isCss
    ? ['/*', ...banner(file.from).split('\n').map((l) => ' *' + l.replace(/^\/\//, '')), ' */', body].join('\n')
    : [
        ...(file.useClient ? ['"use client";', ''] : []),
        ...lines.slice(0, insertAt),
        banner(file.from),
        ...lines.slice(insertAt),
      ].join('\n');

  if (CHECK_ONLY) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (current !== content) {
      console.error(`sync-ui-components: ${file.to} is stale.`);
      console.error(`  source: ${file.from}`);
      console.error(`  fix:    node tools/design/sync-ui-components.mjs`);
      stale++;
    }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, content, 'utf8');
    console.log(`sync-ui-components: wrote ${relative(REPO, out)}`);
  }
}

if (CHECK_ONLY) {
  if (stale) process.exit(1);
  console.log(`sync-ui-components: ${FILES.length} mirrored file(s) are up to date.`);
}
