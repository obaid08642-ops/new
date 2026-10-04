#!/usr/bin/env node
// Q68 guard for CI (replaces `npx expo install --check`, owner decision 2026-10-04).
// Fails only when it matters at runtime:
//   - the installed Expo SDK major differs from the one package.json declares;
//   - a native package the app depends on is on a different major than the one
//     the installed SDK bundles (for 0.x versions, a different minor) — e.g.
//     expo-image-manipulator 14 on SDK 57, the Q68 launch crash;
//   - a native package the app declares is not installed.
// Patch and minor drift (expected ~57.0.26, installed 57.0.14) never fails.
// Offline: compares against the installed SDK's bundledNativeModules.json.
// Usage: node tools/native/check_expo_alignment.mjs <app-dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const parse = (v) => {
  const m = String(v || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : null;
};

// Same "breaking" unit semver uses: the major, or the minor while the major is 0.
export const breakingKey = (v) => {
  const p = parse(v);
  if (!p) return null;
  return p.major === 0 ? `0.${p.minor}` : String(p.major);
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const installedVersion = (appDir, name) => {
  const file = path.join(appDir, 'node_modules', ...name.split('/'), 'package.json');
  return fs.existsSync(file) ? readJson(file).version : null;
};

export function checkAlignment(appDir) {
  const problems = [];
  const pkg = readJson(path.join(appDir, 'package.json'));
  const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (!declared.expo) return { problems: ['expo is not a dependency of this app'], checked: 0 };

  const expoInstalled = installedVersion(appDir, 'expo');
  if (!expoInstalled) return { problems: ['expo is declared but not installed (run npm ci)'], checked: 0 };
  if (breakingKey(declared.expo) !== breakingKey(expoInstalled)) {
    problems.push(`expo SDK ${expoInstalled} installed, package.json declares ${declared.expo}`);
  }

  const bundled = readJson(path.join(appDir, 'node_modules', 'expo', 'bundledNativeModules.json'));
  let checked = 0;
  for (const name of Object.keys(declared).sort()) {
    if (!(name in bundled)) continue;
    checked += 1;
    const have = installedVersion(appDir, name);
    if (!have) {
      problems.push(`${name} is declared (${declared[name]}) but not installed`);
      continue;
    }
    if (breakingKey(have) !== breakingKey(bundled[name])) {
      problems.push(`${name}@${have} — SDK ${expoInstalled} bundles ${bundled[name]} (different major)`);
    }
  }
  return { problems, checked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const appDir = path.resolve(process.argv[2] || '.');
  const { problems, checked } = checkAlignment(appDir);
  if (problems.length) {
    console.error(`native module alignment: ${problems.length} problem(s) in ${appDir}`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`native module alignment: ok (${checked} native packages checked in ${appDir})`);
}
