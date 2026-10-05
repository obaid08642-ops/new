#!/usr/bin/env node
/**
 * Mirror the generated token stylesheets into the web client (12.A2 / A0).
 *
 * WHY A MIRROR AND NOT AN IMPORT
 *
 * `patient-web` is a Next.js app and the tokens live in a sibling package. Every
 * way of pointing a CSS `@import` at that sibling was tried and none of them
 * survive Next's resolvers:
 *
 *   - a relative `@import "../../packages/..."` — a CSS import cannot walk out of
 *     the app root;
 *   - a `turbopack.resolveAlias` / `webpack.resolve.alias` entry — the alias
 *     applies, and the rewritten target is still outside the project, so the
 *     build fails; declaring only one of the two resolvers means it works in dev
 *     and fails in build;
 *   - a `link:` dependency plus an `exports` entry — the same outside-the-root
 *     refusal;
 *   - a symlink inside `app/` — reads fine, and is still refused for resolving
 *     outside the project.
 *
 * So the file is MIRRORED, and the mirror is GENERATED, not hand-written. That is
 * exactly the discipline `packages/brand/dist` and `packages/design-tokens/dist`
 * already use in this repo: the generated artefact is committed so consumers need
 * no build step, and `--check` fails if it drifts from the source of truth.
 *
 * There is still exactly ONE place a colour is written down — `tokens.json` —
 * and this script is the only thing that copies it.
 *
 * Usage: node tools/design/sync-token-css.mjs [--check]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const SRC = join(REPO, 'packages', 'design-tokens', 'dist', 'css');

/**
 * patient-web self-hosts its fonts through next/font/local (patient-web/app/fonts.ts,
 * handoff §1). Its CSP only allows fonts and stylesheets from its own origin
 * (font-src 'self'; style-src 'self'), so the preview `@import` of Google Fonts in
 * fonts.css can never load there: it only costs a blocked request. The web mirror
 * drops that one line; everything else is copied byte for byte.
 */
const GOOGLE_IMPORT = /^@import url\("https:\/\/fonts\.googleapis\.com\/[^"]*"\);$/m;
const selfHostedFonts = (file, css) =>
  file === 'fonts.css'
    ? css.replace(GOOGLE_IMPORT, '/* patient-web: fonts are self-hosted (app/fonts.ts); the Google Fonts preview @import is removed by tools/design/sync-token-css.mjs. */')
    : css;

/** Every client that renders the tokens, where the mirror lives inside it, and how it is adapted. */
const MIRRORS = [
  { client: 'patient-web', to: join(REPO, 'patient-web', 'app', 'design-tokens'), transform: selfHostedFonts },
];

const FILES = ['tokens.css', 'fonts.css'];

if (!existsSync(SRC)) {
  console.error(
    `sync-token-css: ${SRC} does not exist. Run \`npm run build\` in packages/design-tokens first.`,
  );
  process.exit(2);
}

const CHECK_ONLY = process.argv.includes('--check');
const problems = [];

for (const { client, to, transform } of MIRRORS) {
  mkdirSync(to, { recursive: true });
  for (const file of FILES) {
    const from = join(SRC, file);
    const dest = join(to, file);
    const want = transform(file, readFileSync(from, 'utf8'));
    const have = existsSync(dest) ? readFileSync(dest, 'utf8') : null;

    if (have === want) continue;

    if (CHECK_ONLY) {
      problems.push(
        `  ${client}/app/design-tokens/${file} is stale.\n` +
          `      source: packages/design-tokens/dist/css/${file}\n` +
          `      fix:   node tools/design/sync-token-css.mjs`,
      );
    } else {
      writeFileSync(dest, want, 'utf8');
      console.log(`sync-token-css: ${client}/app/design-tokens/${file} <- packages/design-tokens/dist/css/${file}`);
    }
  }
}

if (problems.length) {
  console.error('sync-token-css: FAILED — the committed mirror does not match the generated source.\n');
  problems.forEach((p) => console.error(p));
  process.exit(1);
}

if (CHECK_ONLY) {
  const n = MIRRORS.length * FILES.length;
  console.log(`sync-token-css: ${n} mirrored file(s) are up to date with the generated source.`);
}
