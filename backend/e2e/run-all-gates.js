#!/usr/bin/env node
/* P9 FINAL GATE RUNNER — runs every gate in order and prints a GO/NO-GO verdict.
 * Prereq: backend built + server :4099 up (mongo :27077, redis :6388).
 *   PROVIDER_APP=/path/to/provider node e2e/run-all-gates.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const E2E = __dirname;
const BACKEND = path.join(E2E, '..');
const PROVIDER_APP = process.env.PROVIDER_APP || '/Users/ahmedobaid/Downloads/nabdah-audit/extracted/provider';

// Self-contained ts-jest config for the shared contracts package.
const contractsCfg = path.join('/tmp', 'contracts.jest.config.js');
fs.writeFileSync(contractsCfg, 'module.exports = ' + JSON.stringify({
  rootDir: path.join(BACKEND, '..', 'packages', 'shared-contracts', 'src'),
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '__tests__/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { esModuleInterop: true, experimentalDecorators: true, emitDecoratorMetadata: true, target: 'ES2017' } }] },
  testEnvironment: 'node',
}));

const steps = [
  ['shared-contracts unit gate (P2)', () => spawnSync('npx', ['jest', '--config', contractsCfg], {
    cwd: BACKEND,
    env: { ...process.env, NODE_PATH: path.join(BACKEND, 'node_modules') },
    encoding: 'utf8',
  })],
  ['provider app contracts + ZERO-MOCK (P1/P9)', () => spawnSync(path.join(PROVIDER_APP, 'node_modules/.bin/jest'), [
    '--config', JSON.stringify({ rootDir: PROVIDER_APP, testEnvironment: 'node', testMatch: ['**/provider-app.contracts.test.js'] }),
  ], { cwd: PROVIDER_APP, encoding: 'utf8' })],
  ['governed endpoints e2e (P3)', () => spawnSync('node', [path.join(E2E, 'provider-production.js')], { encoding: 'utf8' })],
  ['pharmacy lifecycle e2e (P4)', () => spawnSync('node', [path.join(E2E, 'pharmacy-scenarios.js')], { encoding: 'utf8' })],
  ['vertical lifecycles e2e (P5-P7)', () => spawnSync('node', [path.join(E2E, 'provider-verticals.js')], { encoding: 'utf8' })],
];

let failed = 0;
for (const [name, run] of steps) {
  const r = run();
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`\n■ ${name}: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) {
    const out = String(r.stdout || '') + String(r.stderr || '');
    console.log(out.slice(-1800));
  }
}

console.log('\n════════════════════════════════════');
console.log(failed === 0 ? '★★★ GO — ALL GATES GREEN ★★★' : `✗ NO-GO — ${failed} gate(s) failed`);
console.log('════════════════════════════════════');
process.exit(failed === 0 ? 0 : 1);
