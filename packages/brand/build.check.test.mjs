// node --test packages/brand/build.check.test.mjs
// The CI brand job runs `build.mjs --check` once before sharp is installed and
// once after. Without sharp, --check must still verify the mark geometry (and
// fail on a redrawn mark) but not fail for the missing rasteriser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

test('--check --require-raster without sharp fails instead of skipping', () => {
  const r = run(isolatedCopy(), '--check', '--require-raster');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sharp is not available/);
});

// CI runs `npm install --prefix ../admin sharp` from packages/brand, which puts
// sharp in packages/admin/node_modules. The second --check must find it there
// and compare the rasters (an empty dist/ then fails), not skip them.
const realSharp = (() => {
  const req = createRequire(import.meta.url);
  for (const p of ['sharp', '../../admin/node_modules/sharp', '../../backend/node_modules/sharp']) {
    try { return dirname(realpathSync(req.resolve(`${p}/package.json`))); } catch { /* next */ }
  }
  return null;
})();

test('--check finds sharp where the CI step installs it and compares the rasters', { skip: !realSharp && 'sharp is not installed here' }, () => {
  const pkg = isolatedCopy();
  mkdirSync(join(pkg, '..', 'admin', 'node_modules'), { recursive: true });
  symlinkSync(realSharp, join(pkg, '..', 'admin', 'node_modules', 'sharp'), 'dir');
  const r = run(pkg, '--check', '--require-raster');
  assert.doesNotMatch(r.stdout, /raster comparison skipped/);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /is not what the generator produces/);
});
