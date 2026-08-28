#!/usr/bin/env node
/*
 * Provider E2E gate runner.
 * Every endpoint, database, secret, and provider-app path is provided explicitly
 * by the caller. This command mutates the isolated E2E database only after the
 * underlying scripts confirm E2E_ALLOW_DESTRUCTIVE=true.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const e2eDir = __dirname;
const backend = path.resolve(e2eDir, '..');
const repoRoot = path.resolve(backend, '..', '..');
const providerApp = process.env.PROVIDER_APP;
const required = ['PROVIDER_APP', 'BASE', 'MONGO_URI', 'E2E_DB', 'E2E_JWT_SECRET', 'E2E_ALLOW_DESTRUCTIVE'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(2);
}
if (process.env.E2E_ALLOW_DESTRUCTIVE !== 'true') {
  console.error('E2E_ALLOW_DESTRUCTIVE must equal true.');
  process.exit(2);
}
if (!fs.existsSync(providerApp)) {
  console.error(`PROVIDER_APP does not exist: ${providerApp}`);
  process.exit(2);
}

const steps = [
  ['shared contracts', 'npm', ['test'], path.join(repoRoot, 'packages', 'shared-contracts')],
  ['provider TypeScript', 'npx', ['tsc', '--noEmit'], providerApp],
  ['provider release contract', 'npx', ['jest', 'provider-app.contracts.test.js', '--runInBand', '--ci'], providerApp],
  ['governed provider endpoints', 'node', [path.join(e2eDir, 'provider-production.js')], backend],
  ['pharmacy lifecycle', 'node', [path.join(e2eDir, 'pharmacy-scenarios.js')], backend],
  ['provider vertical lifecycles', 'node', [path.join(e2eDir, 'provider-verticals.js')], backend],
];

let failed = 0;
for (const [name, command, args, cwd] of steps) {
  const result = spawnSync(command, args, { cwd, env: process.env, encoding: 'utf8' });
  const ok = result.status === 0;
  console.log(`\n${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) {
    failed += 1;
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    console.log(output.slice(-2400));
  }
}

console.log(`\nProvider E2E gate: ${failed === 0 ? 'PASS' : `NO-GO (${failed} failing gate${failed === 1 ? '' : 's'})`}`);
process.exit(failed === 0 ? 0 : 1);
