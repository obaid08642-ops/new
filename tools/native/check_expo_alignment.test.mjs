// node --test tools/native/check_expo_alignment.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkAlignment, breakingKey } from './check_expo_alignment.mjs';

function fixture({ declared, installed, bundled }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-align-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: declared }));
  for (const [name, version] of Object.entries(installed)) {
    const d = path.join(dir, 'node_modules', ...name.split('/'));
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name, version }));
  }
  fs.writeFileSync(path.join(dir, 'node_modules', 'expo', 'bundledNativeModules.json'), JSON.stringify(bundled));
  return dir;
}

const bundled = { 'expo-image-manipulator': '~57.0.11', 'react-native': '0.86.3', 'expo-location': '~57.0.20' };

test('patch drift does not fail (the old --check failed on this)', () => {
  const dir = fixture({
    declared: { expo: '~57.0.14', 'expo-location': '~57.0.11', 'react-native': '0.86.2' },
    installed: { expo: '57.0.14', 'expo-location': '57.0.11', 'react-native': '0.86.2' },
    bundled,
  });
  assert.deepEqual(checkAlignment(dir).problems, []);
});

test('Q68: a native module on another major fails', () => {
  const dir = fixture({
    declared: { expo: '~57.0.14', 'expo-image-manipulator': '~14.0.0' },
    installed: { expo: '57.0.14', 'expo-image-manipulator': '14.0.7' },
    bundled,
  });
  const { problems } = checkAlignment(dir);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /expo-image-manipulator@14\.0\.7/);
});

test('react-native on another 0.x minor fails', () => {
  const dir = fixture({
    declared: { expo: '~57.0.14', 'react-native': '0.85.1' },
    installed: { expo: '57.0.14', 'react-native': '0.85.1' },
    bundled,
  });
  assert.match(checkAlignment(dir).problems.join('\n'), /react-native@0\.85\.1/);
});

test('a declared native module that is not installed fails', () => {
  const dir = fixture({
    declared: { expo: '~57.0.14', 'expo-location': '~57.0.11' },
    installed: { expo: '57.0.14' },
    bundled,
  });
  assert.match(checkAlignment(dir).problems.join('\n'), /expo-location is declared .* not installed/);
});

test('an SDK major mismatch fails', () => {
  const dir = fixture({ declared: { expo: '~58.0.0' }, installed: { expo: '57.0.14' }, bundled });
  assert.match(checkAlignment(dir).problems.join('\n'), /expo SDK 57\.0\.14 installed/);
});

test('breaking unit: major, or minor while major is 0', () => {
  assert.equal(breakingKey('~57.0.26'), '57');
  assert.equal(breakingKey('0.86.3'), '0.86');
  assert.equal(breakingKey('^15.0.2'), '15');
});
