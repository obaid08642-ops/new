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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
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
  { from: 'packages/ui/icons/names.ts', to: 'patient-web/components-next/ui-generated/icons/names.ts' },
  { from: 'packages/ui/icons/illustrations.ts', to: 'patient-web/components-next/ui-generated/icons/illustrations.ts' },
  { from: 'packages/ui/src/Icon.tsx', to: 'patient-web/components-next/ui-generated/src/Icon.tsx', useClient: true },
];

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
  const body = readFileSync(src, 'utf8');
  // A leading `// @ts-nocheck` or shebang must stay first, so the banner is
  // inserted after any leading comment block.
  const lines = body.split('\n');
  let insertAt = 0;
  while (insertAt < lines.length && /^\s*(\/\/|@ts-|['"]use (client|server)|\/\*)/.test(lines[insertAt])) {
    insertAt++;
  }
  const content = [
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
