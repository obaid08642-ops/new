import { spawn, ChildProcess, spawnSync } from 'child_process';
import * as http from 'http';
import * as net from 'net';
import { io as connect, Socket } from 'socket.io-client';
import { ConfiguredIoAdapter, redactRedisUrl } from './configured-io.adapter';

/**
 * P14.13: an emit on one process reaches a socket connected to another one, through Redis. Two Socket.IO servers on two
 * HTTP servers share one real Redis; a socket on B joins a room; A emits to the room. Without the adapter the emit stays
 * on A and the socket never hears it (the second case proves the test can fail).
 */
const hasRedis = spawnSync('redis-server', ['--version']).status === 0;
const freePort = () => new Promise<number>((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

(hasRedis ? describe : describe.skip)('Socket.IO across processes (Redis adapter)', () => {
  jest.setTimeout(30_000);
  let redis: ChildProcess;
  let url = '';
  const open: Array<() => Promise<void> | void> = [];

  beforeAll(async () => {
    const port = await freePort();
    redis = spawn('redis-server', ['--port', String(port), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    url = `redis://127.0.0.1:${port}`;
    await wait(400);
  });
  afterEach(async () => { while (open.length) await open.pop()!(); });
  afterAll(() => { redis?.kill(); });

  async function serverOn(withRedis: boolean) {
    const httpServer = http.createServer();
    const port = await freePort();
    await new Promise<void>((r) => httpServer.listen(port, '127.0.0.1', () => r()));
    const adapter = new ConfiguredIoAdapter(httpServer as any, true);
    if (withRedis) expect(await adapter.connectToRedis(url)).toBe(true);
    const io: any = adapter.createIOServer(0);
    io.on('connection', (s: any) => s.on('join', (room: string) => s.join(room)));
    open.push(async () => { await adapter.close(io); httpServer.close(); });
    return { io, port };
  }

  async function client(port: number): Promise<Socket> {
    const c = connect(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true });
    open.push(() => { c.close(); });
    await new Promise<void>((r) => c.on('connect', () => r()));
    return c;
  }

  it('an emit on server A reaches a socket connected to server B', async () => {
    const a = await serverOn(true);
    const b = await serverOn(true);
    const c = await client(b.port);
    const got: unknown[] = [];
    c.on('order.updated', (p) => got.push(p));
    c.emit('join', 'user:u1');
    await wait(300);
    a.io.to('user:u1').emit('order.updated', { id: 'o1' });
    await wait(500);
    expect(got).toEqual([{ id: 'o1' }]);
  });

  it('without the adapter the emit stays on its own process', async () => {
    const a = await serverOn(false);
    const b = await serverOn(false);
    const c = await client(b.port);
    const got: unknown[] = [];
    c.on('order.updated', (p) => got.push(p));
    c.emit('join', 'user:u1');
    await wait(300);
    a.io.to('user:u1').emit('order.updated', { id: 'o1' });
    await wait(500);
    expect(got).toEqual([]);
  });

  it('an unreachable Redis leaves the server single-process instead of failing the boot', async () => {
    const adapter = new ConfiguredIoAdapter(http.createServer() as any, true);
    const port = await freePort();
    await expect(adapter.connectToRedis(`redis://127.0.0.1:${port}`)).resolves.toBe(false);
  });
});

describe('redactRedisUrl', () => {
  it('never logs the password', () => {
    expect(redactRedisUrl('redis://:s3cret@redis:6379')).not.toContain('s3cret');
    expect(redactRedisUrl('redis://user:s3cret@redis:6379/0')).not.toContain('s3cret');
    expect(redactRedisUrl('not a url')).toBe('redis://(unparsable)');
  });
});
