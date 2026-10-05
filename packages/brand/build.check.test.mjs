// node --test packages/brand/build.check.test.mjs
// The CI brand job runs `build.mjs --check` once before sharp is installed and
// once after. Without sharp, --check must still verify the mark geometry (and
// fail on a redrawn mark) but not fail for the missing rasteriser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** A copy of the package two levels deep in a folder with no sharp anywhere. */
function isolatedCopy() {
  const root = mkdtempSync(join(tmpdir(), 'brand-nosharp-'));
  const pkg = join(root, 'packages', 'brand');
  cpSync(join(HERE, 'build.mjs'), join(pkg, 'build.mjs'));
  cpSync(join(HERE, 'src'), join(pkg, 'src'), { recursive: true });
  return pkg;
}

const run = (pkg, ...args) => spawnSync(process.execPath, ['build.mjs', ...args], { cwd: pkg, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } });

test('--check without sharp verifies the geometry and passes', () => {
  const r = run(isolatedCopy(), '--check');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /geometry verified; raster comparison skipped/);
});

test('--check without sharp still fails on a redrawn mark', () => {
  const pkg = isolatedCopy();
  const file = join(pkg, 'src', 'logo-mark.svg');
  writeFileSync(file, readFileSync(file, 'utf8').replace('M40 104 C40 196 200 196 200 104', 'M40 100 C40 196 200 196 200 100'));
  const r = run(pkg, '--check');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /approved bowl path/);
});

test('a build without sharp fails', () => {
  const r = run(isolatedCopy());
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sharp is not available/);
});
