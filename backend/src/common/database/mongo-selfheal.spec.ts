import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoSelfHealService, selfHealAfterMs, selfHealEnabled } from './mongo-selfheal.service';
import { mongoAppName, mongoConnectionOptions } from './mongo-options';

// 2026-11-01: mongod restarted, came back healthy, and the backend stayed unusable for two hours. These tests pin (1) the decision logic of the in-process
// safety net and (2) that the real connection options do reconnect after a mongod restart.
describe('MongoSelfHealService (decision logic)', () => {
  function make(readyState: number, pingOk: boolean) {
    const conn: any = { readyState, db: { admin: () => ({ ping: () => (pingOk ? Promise.resolve({ ok: 1 }) : new Promise(() => undefined)) }) } };
    const svc = new MongoSelfHealService(conn);
    const exit = jest.fn();
    svc.exit = exit;
    return { svc, conn, exit };
  }
  beforeEach(() => { delete process.env.BACKEND_MONGO_SELFHEAL_AFTER_SECONDS; });

  it('does nothing while the connection is usable', async () => {
    const { svc, exit } = make(1, true);
    expect(await svc.tick(0)).toBe('ok');
    expect(exit).not.toHaveBeenCalled();
  });

  it('waits out a short outage, then exits when mongod answers a fresh client', async () => {
    const { svc, conn, exit } = make(0, false);
    svc.probe = async () => true;
    expect(await svc.tick(1_000)).toBe('waiting');
    expect(await svc.tick(60_000)).toBe('waiting');                    // 59 s down
    expect(exit).not.toHaveBeenCalled();
    expect(await svc.tick(91_001)).toBe('exit');                       // 90.001 s down
    expect(exit).toHaveBeenCalledWith(1);
    expect(conn.readyState).toBe(0);
  });

  it('does not exit when mongod itself is down (a crash loop would not help)', async () => {
    const { svc, exit } = make(0, false);
    svc.probe = async () => false;
    await svc.tick(0);
    expect(await svc.tick(200_000)).toBe('mongod-down');
    expect(exit).not.toHaveBeenCalled();
  });

  it('a wedged pool (readyState 1, ping never answers) counts as unusable', async () => {
    const { svc, exit } = make(1, false);
    svc.probe = async () => true;
    await svc.tick(0);                                                  // the 3 s ping timeout makes this take 3 s of real time
    expect(await svc.tick(95_000)).toBe('exit');
    expect(exit).toHaveBeenCalledWith(1);
  }, 20_000);

  it('a recovery resets the clock', async () => {
    const { svc, conn, exit } = make(0, true);
    svc.probe = async () => true;
    await svc.tick(0);
    conn.readyState = 1;
    expect(await svc.tick(80_000)).toBe('ok');
    conn.readyState = 0;
    expect(await svc.tick(85_000)).toBe('waiting');                    // a new outage starts at 85 s, not at 0
    expect(exit).not.toHaveBeenCalled();
  });

  it('is on by default in production, off elsewhere, and the env overrides both ways; the delay is configurable', () => {
    expect(selfHealEnabled({ NODE_ENV: 'production' } as any)).toBe(true);
    expect(selfHealEnabled({ NODE_ENV: 'test' } as any)).toBe(false);
    expect(selfHealEnabled({ NODE_ENV: 'production', BACKEND_MONGO_SELFHEAL: '0' } as any)).toBe(false);
    expect(selfHealEnabled({ NODE_ENV: 'development', BACKEND_MONGO_SELFHEAL: '1' } as any)).toBe(true);
    expect(selfHealAfterMs({} as any)).toBe(90_000);
    expect(selfHealAfterMs({ BACKEND_MONGO_SELFHEAL_AFTER_SECONDS: '30' } as any)).toBe(30_000);
    expect(selfHealAfterMs({ BACKEND_MONGO_SELFHEAL_AFTER_SECONDS: 'x' } as any)).toBe(90_000);
  });
});

describe('the application connection recovers after mongod restarts', () => {
  jest.setTimeout(120_000);
  it('reconnects with the production options once mongod is back on the same port', async () => {
    let srv = await MongoMemoryServer.create();
    const port = Number(new URL(srv.getUri()).port);
    const o = mongoConnectionOptions({ MONGO_URL: srv.getUri(), DB_NAME: 'selfheal', MONGO_MIN_POOL_SIZE: '2', MONGO_MAX_POOL_SIZE: '10' } as any);
    const { uri, ...opts } = o;
    const conn = await mongoose.createConnection(uri, opts as any).asPromise();
    try {
      await conn.collection('t').insertOne({ n: 1 });
      await srv.stop();
      await expect(conn.collection('t').insertOne({ n: 2 })).rejects.toBeTruthy();   // down: the call fails (fast), it does not hang
      srv = await MongoMemoryServer.create({ instance: { port, launchTimeout: 60_000 } });
      const svc = new MongoSelfHealService(conn);
      let ok = false;
      const until = Date.now() + 60_000;
      while (Date.now() < until && !ok) {
        ok = await svc.usable();
        if (!ok) await new Promise((r) => setTimeout(r, 1_000));
      }
      expect(ok).toBe(true);
      await conn.collection('t').insertOne({ n: 3 });                                  // real work works again, no restart of the process
      expect(await conn.collection('t').countDocuments({ n: 3 })).toBe(1);
    } finally {
      await conn.close().catch(() => null);
      await srv.stop().catch(() => null);
    }
  });
});

describe('mongo appName', () => {
  it('is nabd-<role> so the connections of the api and the worker can be told apart', () => {
    expect(mongoAppName({ PROCESS_ROLE: 'api' } as any)).toBe('nabd-api');
    expect(mongoAppName({ PROCESS_ROLE: 'worker' } as any)).toBe('nabd-worker');
    expect(mongoAppName({} as any)).toBe('nabd-all');
    expect(mongoConnectionOptions({ PROCESS_ROLE: 'worker' } as any).appName).toBe('nabd-worker');
  });

  it('reaches mongod: the server lists the connection under that name', async () => {
    const srv = await MongoMemoryServer.create();
    const { uri, ...opts } = mongoConnectionOptions({ MONGO_URL: srv.getUri(), DB_NAME: 'app', PROCESS_ROLE: 'worker', MONGO_MIN_POOL_SIZE: '1', MONGO_MAX_POOL_SIZE: '3' } as any);
    const conn = await mongoose.createConnection(uri, opts as any).asPromise();
    try {
      const res: any = await conn.getClient().db('admin').admin().command({ currentOp: 1, $all: true } as any).catch(() => null);
      const names = JSON.stringify(res?.inprog ?? []);
      expect(names).toContain('nabd-worker');
    } finally {
      await conn.close();
      await srv.stop();
    }
  });
});
