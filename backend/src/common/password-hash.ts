/**
 * Password hashing that does not block the event loop.
 *
 * `bcryptjs` is pure JavaScript: one `hash`/`compare` at cost 12 keeps the main thread busy for about 300 ms (in slices of at most ~100 ms). Measured with the same
 * probe the load shedder uses (`monitorEventLoopDelay`, 20 ms resolution, mean over 5 s): one check at a time gives a mean delay of about 95 ms, three at once about
 * 240 ms, six at once about 500 ms. The overload governor (`overload.ts`) moves to level 1 at 150 ms (admin reads are shed, suggestions and recommendations switch off)
 * and to level 2 at 250 ms (search, public and user reads are shed), and stays there for 30 s after the last high reading. So a burst of sign-ins, or a seed that hashes
 * twenty passwords at boot, made the server answer `503 server_shedding_load` to unrelated reads (live gate, 2026-11-08: `j_admin` and `j_web_order_center_returns`).
 *
 * The fix is to do the hashing off the main thread. This module is a drop-in for the three calls the code uses (`hash`, `compare`, `hashSync`): the same bcryptjs, the same
 * `$2a/$2b` hashes (existing hashes keep verifying, new ones verify with any bcrypt), but `hash` and `compare` run in a small pool of worker threads.
 *   BCRYPT_WORKERS      pool size (default: one less than the CPUs, at most 2, at least 1). Workers start on first use, are unref'd (they never keep the process alive) and cost ~25 MB each.
 *   BCRYPT_INLINE=1     hash on the main thread, as before (unit tests set it by themselves under jest; a worker that cannot start falls back to it and logs once)
 *   BCRYPT_FORCE_WORKER=1  use the workers even under jest (the spec of this module does)
 */
import * as bcryptjs from 'bcryptjs';
import { availableParallelism } from 'os';
import { Worker } from 'worker_threads';
import { logEvent } from './structured-logger';

export const hashSync = bcryptjs.hashSync;
export const compareSync = bcryptjs.compareSync;
export const genSaltSync = bcryptjs.genSaltSync;

const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads');
const bcrypt = require(workerData.path);
parentPort.on('message', async (m) => {
  try {
    const out = m.op === 'hash' ? await bcrypt.hash(m.a, m.b) : await bcrypt.compare(m.a, m.b);
    parentPort.postMessage({ id: m.id, out });
  } catch (e) {
    parentPort.postMessage({ id: m.id, err: String((e && e.message) || e) });
  }
});
`;

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void }
interface Slot { worker: Worker; pending: Map<number, Pending> }

const slots: Slot[] = [];
let nextId = 1;
let warned = false;

function poolSize(): number {
  const env = Number(process.env.BCRYPT_WORKERS);
  if (Number.isInteger(env) && env > 0) return Math.min(env, 8);
  return Math.min(2, Math.max(1, availableParallelism() - 1));
}

function inline(): boolean {
  if (process.env.BCRYPT_FORCE_WORKER === '1') return false;
  return process.env.BCRYPT_INLINE === '1' || process.env.JEST_WORKER_ID !== undefined;
}

function spawn(): Slot | undefined {
  try {
    const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { path: require.resolve('bcryptjs') }, resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 8 } });
    const slot: Slot = { worker, pending: new Map() };
    const fail = (err: Error) => {
      const i = slots.indexOf(slot);
      if (i >= 0) slots.splice(i, 1);   // the next call starts a new worker
      for (const p of slot.pending.values()) p.reject(err);
      slot.pending.clear();
    };
    worker.on('message', (m: { id: number; out?: unknown; err?: string }) => {
      const p = slot.pending.get(m.id);
      if (!p) return;
      slot.pending.delete(m.id);
      if (m.err !== undefined) p.reject(new Error(m.err)); else p.resolve(m.out);
    });
    worker.on('error', (e) => fail(e instanceof Error ? e : new Error(String(e))));
    worker.on('exit', (code) => fail(new Error(`password worker exited (${code})`)));
    worker.unref();
    slots.push(slot);
    return slot;
  } catch (e) {
    if (!warned) { warned = true; logEvent('warn', 'password_worker_unavailable', { reason: (e as Error).message, fallback: 'main thread' }, 'password-hash'); }
    return undefined;
  }
}

function pick(): Slot | undefined {
  const idle = slots.find((s) => s.pending.size === 0);
  if (idle) return idle;
  if (slots.length < poolSize()) { const s = spawn(); if (s) return s; }
  return slots.reduce<Slot | undefined>((best, s) => (!best || s.pending.size < best.pending.size ? s : best), undefined);
}

function run<T>(op: 'hash' | 'compare', a: string, b: string | number, fallback: () => Promise<T>): Promise<T> {
  if (inline()) return fallback();
  const slot = pick();
  if (!slot) return fallback();
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    slot.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    slot.worker.postMessage({ id, op, a, b });
  });
}

/** bcrypt hash of `data`; `saltOrRounds` as in bcryptjs. Runs in a worker thread (see the header). */
export function hash(data: string, saltOrRounds: string | number): Promise<string> {
  return run<string>('hash', data, saltOrRounds, () => bcryptjs.hash(data, saltOrRounds as never));
}

/** true when `data` matches the bcrypt `encrypted`. Runs in a worker thread (see the header). */
export function compare(data: string, encrypted: string): Promise<boolean> {
  return run<boolean>('compare', data, encrypted, () => bcryptjs.compare(data, encrypted));
}

/** Stops the workers (tests). */
export async function stopPasswordWorkers(): Promise<void> {
  const all = slots.splice(0);
  await Promise.all(all.map((s) => s.worker.terminate()));
}
