/** R4: two API nodes share one waiting-room queue per doctor (real redis-server, like configured-io.adapter.spec.ts). */
import { spawn, spawnSync, ChildProcess } from 'child_process';
import net from 'net';
import Redis from 'ioredis';
import { WaitingRoomQueue } from './waiting-room-queue';

const hasRedis = spawnSync('redis-server', ['--version']).status === 0;
const freePort = () => new Promise<number>((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('WaitingRoomQueue without Redis (hand-built tests)', () => {
  it('keeps order, ignores a second join, removes once', async () => {
    const q = new WaitingRoomQueue();
    await q.add('d1', 'a'); await q.add('d1', 'b'); await q.add('d1', 'a');
    expect(await q.list('d1')).toEqual(['a', 'b']);
    expect(await q.remove('d1', 'a')).toBe(true);
    expect(await q.remove('d1', 'a')).toBe(false);
    expect(await q.list('d1')).toEqual(['b']);
  });
});

(hasRedis ? describe : describe.skip)('WaitingRoomQueue across two nodes (Redis)', () => {
  jest.setTimeout(20_000);
  let server: ChildProcess; let r: Redis;
  const api = () => ({
    zadd: async (k: string, s: number, m: string) => { await r.zadd(k, s, m); },
    zrem: async (k: string, m: string) => { await r.zrem(k, m); },
    zrange: (k: string, a: number, b: number) => r.zrange(k, String(a), String(b)),
    zscore: async (k: string, m: string) => { const v = await r.zscore(k, m); return v === null ? null : Number(v); },
    expire: async (k: string, t: number) => (await r.expire(k, t)) === 1,
  });
  beforeAll(async () => {
    const port = await freePort();
    server = spawn('redis-server', ['--port', String(port), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    await wait(400);
    r = new Redis(`redis://127.0.0.1:${port}`);
  });
  afterAll(async () => { await r?.quit(); server?.kill(); });
  beforeEach(() => r.flushall());

  it('patients joining on node A and node B are in one queue with one position order', async () => {
    let t = 1000;
    const a = new WaitingRoomQueue(api() as any, () => t++);
    const b = new WaitingRoomQueue(api() as any, () => t++);
    await a.add('d1', 'appt-1');
    await b.add('d1', 'appt-2');
    await a.add('d1', 'appt-3');
    expect(await a.list('d1')).toEqual(['appt-1', 'appt-2', 'appt-3']);
    expect(await b.list('d1')).toEqual(['appt-1', 'appt-2', 'appt-3']);
  });

  it('a re-join keeps the original place; leaving on the other node removes it; queues of two doctors are separate', async () => {
    let t = 1;
    const a = new WaitingRoomQueue(api() as any, () => t++);
    const b = new WaitingRoomQueue(api() as any, () => t++);
    await a.add('d1', 'x'); await a.add('d1', 'y'); await b.add('d1', 'x');
    await a.add('d2', 'z');
    expect(await b.list('d1')).toEqual(['x', 'y']);
    expect(await b.remove('d1', 'x')).toBe(true);
    expect(await a.remove('d1', 'x')).toBe(false);
    expect(await a.list('d1')).toEqual(['y']);
    expect(await a.list('d2')).toEqual(['z']);
    expect(await r.ttl('waitroom:queue:d1')).toBeGreaterThan(0);
  });
});
