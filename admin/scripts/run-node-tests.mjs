#!/usr/bin/env node
/**
 * Run the admin `node:test` specs with the runner their headers document.
 *
 * These specs (`src/lib/admin-session.test.ts`, `src/lib/json-ld.test.ts`) come
 * from the `node:test` style and are executed by jiti — see the "Run:" line at
 * the top of each file. They cannot be left to `vitest run`: vitest bridges
 * `node:test` so their assertions do run and pass, but its collector finds no
 * `describe`/`it` and marks the file "No test suite found", failing the run.
 * `vitest.config.ts` therefore excludes them and this script runs them, so
 * `npm test` covers both styles and still fails loudly on a real failure.
 *
 * One child process per spec: `node:test` sets a non-zero exit code on failure,
 * so the runner's exit code is the honest aggregate, and a module-scope throw in
 * one spec cannot mask the others' results.
 *
 * The `@` -> `src` alias is passed to jiti explicitly, mirroring the alias in
 * `vitest.config.ts` and the `@/*` path in `tsconfig.json`; without it the bare
 * `jiti` command cannot resolve the API handlers these specs import.
 *
 * Usage:  node scripts/run-node-tests.mjs            # run every node:test spec
 *         node scripts/run-node-tests.mjs --one FILE # bootstrap a single spec
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ADMIN_ROOT, findNodeTestSpecs } from './node-test-specs.mjs';

const SELF = fileURLToPath(import.meta.url);

const argv = process.argv.slice(2);
const one = argv.indexOf('--one');

if (one !== -1) {
  const { createJiti } = await import('jiti');
  const jiti = createJiti(ADMIN_ROOT, { alias: { '@': resolve(ADMIN_ROOT, 'src') } });
  await jiti.import(resolve(ADMIN_ROOT, argv[one + 1]));
} else {
  const specs = findNodeTestSpecs();
  if (specs.length === 0) {
    console.log('node:test specs: none found — nothing to run.');
    process.exit(0);
  }

  const failures = [];
  for (const spec of specs) {
    console.log(`\n▶ node:test  ${spec}`);
    const result = spawnSync(process.execPath, [SELF, '--one', spec], { stdio: 'inherit', cwd: ADMIN_ROOT });
    if (result.error) {
      console.error(`could not run ${spec}: ${result.error.message}`);
      failures.push(spec);
    } else if (result.status !== 0) {
      failures.push(spec);
    }
  }

  const passed = specs.length - failures.length;
  console.log(`\nnode:test files: ${passed} passed, ${failures.length} failed (${specs.length} total)`);
  if (failures.length) {
    console.error(`failed: ${failures.join(', ')}`);
    process.exit(1);
  }
}