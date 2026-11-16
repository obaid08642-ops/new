import { ServiceUnavailableException } from '@nestjs/common';
import { ConcurrencyGate } from './concurrency-gate';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('ConcurrencyGate', () => {
  it('never runs more than max jobs at once and runs the waiting ones in order', async () => {
    const gate = new ConcurrencyGate(2, 1000);
    let now = 0; let peak = 0; const order: number[] = [];
    const job = (n: number) => gate.run(async () => { now += 1; peak = Math.max(peak, now); await tick(15); order.push(n); now -= 1; return n; });
    const out = await Promise.all([1, 2, 3, 4, 5].map(job));
    expect(out).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
    expect(order.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(gate.active).toBe(0);
    expect(gate.waiting).toBe(0);
  });

  it('a job that waits longer than waitMs is refused with 503 and the reason, and the running ones are untouched', async () => {
    const gate = new ConcurrencyGate(1, 30, 'catalogue_busy');
    const slow = gate.run(async () => { await tick(120); return 'done'; });
    await tick(5);
    await expect(gate.run(async () => 'never')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(gate.run(async () => 'never')).rejects.toMatchObject({ message: 'catalogue_busy' });
    expect(await slow).toBe('done');
    expect(gate.rejected).toBe(2);
    expect(await gate.run(async () => 'next')).toBe('next');
  });

  it('a full queue refuses at once, without waiting', async () => {
    const gate = new ConcurrencyGate(1, 5000, 'busy', 1);
    const first = gate.run(async () => { await tick(60); });
    await tick(5);
    const queued = gate.run(async () => 'q');
    const started = Date.now();
    await expect(gate.run(async () => 'x')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(Date.now() - started).toBeLessThan(40);
    await first; expect(await queued).toBe('q');
  });

  it('a failing job releases its place', async () => {
    const gate = new ConcurrencyGate(1, 1000);
    await expect(gate.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(gate.active).toBe(0);
    expect(await gate.run(async () => 'ok')).toBe('ok');
  });
});
