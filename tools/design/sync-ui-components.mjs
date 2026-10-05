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
  { from: 'packages/ui/icons/marks.ts', to: 'patient-web/components-next/ui-generated/icons/marks.ts' },
  { from: 'packages/ui/icons/fill-glyphs.ts', to: 'patient-web/components-next/ui-generated/icons/fill-glyphs.ts' },
  { from: 'packages/ui/icons/line.ts', to: 'patient-web/components-next/ui-generated/icons/line.ts' },
  { from: 'packages/ui/components/contract.ts', to: 'patient-web/components-next/ui-generated/components/contract.ts' },
  ...['Button', 'Spinner', 'FIcon', 'Inputs', 'Controls', 'Surfaces', 'Cards', 'Feedback'].map((name) => ({
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
 * The web mirror of fill.ts carries only the filled glyphs patient-web (and the components themselves) name.
 *
 * `FIcon` picks its outline by name at run time, so the whole record is in every bundle that draws one FIcon:
 * 78 outlines, about 10 KB gz, of which a page uses a handful (issue #286). The package keeps the full set
 * (native, the gallery and the board comparison read it); the mirror is filtered to the names that appear as a
 * quoted string anywhere in patient-web's own source, in the component sources, or in SERVICE_ICONS. The
 * mirror is regenerated (and `--check`ed) from those same sources, and `FillIconName` is derived from the
 * record, so a name that is not in the mirror is a type error until `sync-ui-components` is run again.
 */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name === 'ui-generated') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
  }
  return out;
}
function usedFillGlyphs(fillSource) {
  const record = fillSource.match(/export const FILL_ICON_PATHS = (\{[\s\S]*?\n\}) as const;/);
  if (!record) throw new Error('sync-ui-components: FILL_ICON_PATHS not found in packages/ui/icons/fill.ts');
  const paths = JSON.parse(record[1]);
  const sources = [
    ...['patient-web/app', 'patient-web/components-next', 'patient-web/lib'].flatMap((d) => walk(join(REPO, d))),
    ...['packages/ui/components', 'packages/ui/src', 'packages/ui/shells'].flatMap((d) => walk(join(REPO, d))),
  ].map((f) => readFileSync(f, 'utf8')).join('\n');
  const service = [...fillSource.matchAll(/icon: '([a-z0-9-]+)'/g)].map((m) => m[1]);
  const keep = Object.keys(paths).filter((n) => service.includes(n) || new RegExp(`["'\`]${n}["'\`]`).test(sources));
  return { record, paths, keep };
}
function filterFill(body) {
  const { record, paths, keep } = usedFillGlyphs(body);
  const filtered = Object.fromEntries(keep.map((n) => [n, paths[n]]));
  return body.replace(
    record[0],
    `// WEB MIRROR: only the ${keep.length} of ${Object.keys(paths).length} glyphs patient-web names (tools/design/sync-ui-components.mjs, issue #286).\nexport const FILL_ICON_PATHS = ${JSON.stringify(filtered, null, 2)} as const;`,
  );
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
