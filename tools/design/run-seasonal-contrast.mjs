#!/usr/bin/env node
/**
 * 12.A12 — contrast under EVERY seasonal theme.
 *
 * The default palette is checked by `contrast-check`. A seasonal theme is a set
 * of token overrides, so it can silently change a pairing the designer never
 * re-examined: move `service.lab.bg` a shade and a "lab" chip that passed at
 * 4.6:1 is now at 3.9:1, and nothing in the build notices.
 *
 * So each theme is re-run through the SAME checker, with SEASONAL_ID set, and the
 * theme is applied only to the tokens it declares. Cheap, mechanical, and it is
 * the difference between "the seasonal themes were checked once" and "they are
 * checked every time a token changes".
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(REPO, 'packages/design-tokens/tokens.json'), 'utf8'));
const themes = tokens.seasonal?.themes ?? [];
if (!themes.length) {
  console.error('run-seasonal-contrast: tokens.json declares no seasonal themes.');
  process.exit(2);
}

let failed = 0;
for (const theme of themes) {
  const r = spawnSync(
    process.execPath,
    [join(REPO, 'tools/design/contrast-check.ts')],
    { env: { ...process.env, SEASONAL_ID: theme.id }, stdio: 'inherit' },
  );
  if (r.status !== 0) {
    failed++;
    console.error(`run-seasonal-contrast: seasonal theme "${theme.id}" FAILED contrast.`);
  }
}
if (failed) {
  console.error(`\nrun-seasonal-contrast: ${failed} seasonal theme(s) failed. A theme that cannot be read is not a theme.`);
  process.exit(1);
}
console.log(`run-seasonal-contrast: all ${themes.length} seasonal theme(s) pass in both light and dark.`);
