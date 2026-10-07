/**
 * Single source of truth for which admin specs are `node:test` specs.
 *
 * `admin` has two test styles side by side:
 *   * vitest specs — `describe`/`it`, collected by `vitest run`;
 *   * `node:test` specs — `import { test } from 'node:test'`, which use the
 *     runner documented in their own header (`node_modules/.bin/jiti <file>`).
 *
 * The two runners cannot own the same file. Vitest bridges `node:test`, so the
 * assertions do execute, but its own collector finds no `describe`/`it` and
 * reports the file as "No test suite found" — a non-zero exit for a suite that
 * actually passed. So vitest must NOT collect `node:test` files, and the node
 * runner must run exactly the set vitest skipped.
 *
 * Both `vitest.config.ts` and `scripts/run-node-tests.mjs` import the discovery
 * below, so the exclude list and the run list cannot drift apart: any spec that
 * imports `node:test` is handed to the node runner and kept away from vitest.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ADMIN_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ADMIN_ROOT, 'src');

const NODE_TEST_IMPORT = /from\s+['"]node:test['"]/;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.test\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

/**
 * Every `src/**` spec that imports `node:test`, as repo-relative POSIX paths.
 * Detected from the file's own source rather than a hardcoded list, so a new
 * `node:test` spec is routed correctly without editing any config.
 */
export function findNodeTestSpecs() {
  return walk(SRC)
    .filter((file) => NODE_TEST_IMPORT.test(readFileSync(file, 'utf8')))
    .map((file) => relative(ADMIN_ROOT, file).split(sep).join('/'))
    .sort();
}