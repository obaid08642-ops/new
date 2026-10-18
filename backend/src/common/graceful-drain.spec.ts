import Fastify from 'fastify';
import { GracefulDrain } from './graceful-drain';

// 20.9: while draining, every answer says Connection: close; the drain waits SHUTDOWN_DRAIN_MS before returning
describe('GracefulDrain', () => {
  const old = process.env.SHUTDOWN_DRAIN_MS;
  afterEach(() => { process.env.SHUTDOWN_DRAIN_MS = old; if (old === undefined) delete process.env.SHUTDOWN_DRAIN_MS; });

  async function build() {
    const fastify = Fastify();
    fastify.get('/x', async () => ({ ok: true }));
    const drain = new GracefulDrain({ httpAdapter: { getInstance: () => fastify } } as any);
    drain.onModuleInit();
    await fastify.ready();
    return { fastify, drain };
  }

  it('answers normally before the shutdown starts', async () => {
    const { fastify } = await build();
    const r = await fastify.inject({ method: 'GET', url: '/x' });
    expect(r.statusCode).toBe(200);
    expect(r.headers.connection).not.toBe('close');
    await fastify.close();
  });

  it('keeps serving with Connection: close during the drain, then returns', async () => {
    process.env.SHUTDOWN_DRAIN_MS = '150';
    const { fastify, drain } = await build();
    const t0 = Date.now();
    const done = drain.onModuleDestroy();
    expect(drain.isDraining).toBe(true);
    const r = await fastify.inject({ method: 'GET', url: '/x' });
    expect(r.statusCode).toBe(200);
    expect(r.headers.connection).toBe('close');
    await done;
    expect(Date.now() - t0).toBeGreaterThanOrEqual(140);
    await fastify.close();
  });

  it('does nothing when SHUTDOWN_DRAIN_MS is unset', async () => {
    delete process.env.SHUTDOWN_DRAIN_MS;
    const { fastify, drain } = await build();
    await drain.onModuleDestroy();
    expect(drain.isDraining).toBe(false);
    await fastify.close();
  });
});
