// Chunked Jest runner — prevents single-process heap exhaustion (OOM).
// Runs src/**/*.spec.ts in separate Jest processes so each chunk gets a fresh heap.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHUNK_SIZE = Number(process.env.JEST_CHUNK_SIZE || 22);

function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p, out);
    else if (p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const files = collect('src').sort();
const extraArgs = process.argv.slice(2).filter((a) => a !== '--runInBand');
const chunks = [];
for (let i = 0; i < files.length; i += CHUNK_SIZE) chunks.push(files.slice(i, i + CHUNK_SIZE));
console.log('[chunked-jest] ' + files.length + ' suites in ' + chunks.length + ' chunks of ' + CHUNK_SIZE);

let failed = 0;
for (let i = 0; i < chunks.length; i++) {
  console.log('\n[chunked-jest] chunk ' + (i + 1) + '/' + chunks.length);
  const r = spawnSync('npx', ['jest', '--runInBand', '--forceExit', ...extraArgs, ...chunks[i]], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=2048' },
  });
  if (r.status !== 0) { failed += 1; console.error('[chunked-jest] chunk ' + (i + 1) + ' FAILED'); }
}
console.log('\n[chunked-jest] done: ' + (chunks.length - failed) + '/' + chunks.length + ' chunks passed');
process.exit(failed ? 1 : 0);
