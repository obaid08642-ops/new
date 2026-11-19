// Chunked Jest runner — prevents single-process heap exhaustion (OOM).
// Runs src/**/*.spec.ts in separate Jest processes so each chunk gets a fresh heap.
//
// A chunk that dies of heap exhaustion (the V8 "JavaScript heap out of memory" abort) is NOT a test failure: it is split in half and each half is run in a fresh process, down to one file. Every
// spec still runs and every real failure still fails the run (a chunk that fails any other way is reported as it is, never retried). 2026-11-17: adding real-MongoDB explain specs moved the chunk
// boundaries and chunk 5 (the contract suites plus the mongo specs) exceeded the 2 GB heap of one process although each file passes alone.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHUNK_SIZE = Number(process.env.JEST_CHUNK_SIZE || 22);
const HEAP_MB = Number(process.env.JEST_HEAP_MB || 3072);

function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p, out);
    else if (p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

/** True when the process was killed by V8 running out of heap (stderr text, or the abort signal / exit code 134 node uses for it). */
export function diedOfHeapExhaustion(result) {
  const stderr = String(result.stderr || '');
  return /JavaScript heap out of memory|Ineffective mark-compacts near heap limit/.test(stderr) || result.signal === 'SIGABRT' || result.status === 134;
}

function runOnce(files, extraArgs) {
  const r = spawnSync('npx', ['jest', '--runInBand', '--forceExit', ...extraArgs, ...files], {
    stdio: ['inherit', 'inherit', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || `--max-old-space-size=${HEAP_MB}` },
  });
  if (r.stderr && r.stderr.length) process.stderr.write(r.stderr);
  return r;
}

/** Run one chunk; on heap exhaustion split it in halves (fresh process each). Returns the number of FAILED chunks (0 = all passed). */
export function runChunk(files, extraArgs, label, run = runOnce, log = console) {
  const r = run(files, extraArgs);
  if (r.status === 0) return 0;
  if (files.length > 1 && diedOfHeapExhaustion(r)) {
    const mid = Math.ceil(files.length / 2);
    log.error('[chunked-jest] ' + label + ' ran out of heap (' + files.length + ' suites): running it again as two halves in fresh processes');
    return runChunk(files.slice(0, mid), extraArgs, label + 'a', run, log) + runChunk(files.slice(mid), extraArgs, label + 'b', run, log);
  }
  log.error('[chunked-jest] chunk ' + label + ' FAILED' + (diedOfHeapExhaustion(r) ? ' (out of heap even alone: ' + files[0] + ')' : ''));
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = collect('src').sort();
  const extraArgs = process.argv.slice(2).filter((a) => a !== '--runInBand');
  const chunks = [];
  for (let i = 0; i < files.length; i += CHUNK_SIZE) chunks.push(files.slice(i, i + CHUNK_SIZE));
  console.log('[chunked-jest] ' + files.length + ' suites in ' + chunks.length + ' chunks of ' + CHUNK_SIZE);

  let failed = 0;
  for (let i = 0; i < chunks.length; i++) {
    console.log('\n[chunked-jest] chunk ' + (i + 1) + '/' + chunks.length);
    failed += runChunk(chunks[i], extraArgs, String(i + 1));
  }
  console.log('\n[chunked-jest] done: ' + (chunks.length - Math.min(failed, chunks.length)) + '/' + chunks.length + ' chunks passed');
  process.exit(failed ? 1 : 0);
}
