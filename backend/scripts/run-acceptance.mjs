#!/usr/bin/env node
// Runs reviewer-written acceptance tests (backend/acceptance/<id>/).
//   node scripts/run-acceptance.mjs q79     one item (the agent's target)
//   node scripts/run-acceptance.mjs --done  every item listed in acceptance/DONE (part of the gate)
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const arg = process.argv[2];
if (!arg) { console.error('usage: run-acceptance.mjs <id> | --done'); process.exit(2); }
const ids = arg === '--done'
  ? (existsSync('acceptance/DONE') ? readFileSync('acceptance/DONE', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [])
  : [arg];
if (!ids.length) { console.log('acceptance: no approved items yet'); process.exit(0); }
let failed = 0;
for (const id of ids) {
  if (!/^[a-z0-9-]+$/.test(id) || !existsSync(`acceptance/${id}`)) { console.error(`acceptance: unknown item ${id}`); failed++; continue; }
  const r = spawnSync('npx', ['jest', '--config', 'jest.acceptance.config.js', '--runInBand', `acceptance/${id}/`], { stdio: 'inherit' });
  console.log(`acceptance ${id}: ${r.status === 0 ? 'PASS' : 'FAIL'}`);
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
