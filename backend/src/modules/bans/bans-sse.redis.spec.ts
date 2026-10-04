/**
 * 14.13 — bans + SSE via Redis (mocked, shared across "workers").
 *
 * Proves, without a live server:
 *  1. cross-worker ban visibility — ban()/unban() on worker A is observable
 *     via isBannedAsync()/isBanned() on worker B through the shared Redis set;
 *  2. SSE fan-out — emit() on worker A reaches a subscriber of worker B via
 *     Redis pub/sub with the exact SSE event shape preserved;
 *  3. local-only fallback — both classes work with Redis absent/down.
 */
import { BansService } from './bans.service';
import { NotificationSseController } from '../notifications/sse.controller';

// Shared in-process stand-in for Redis: one backing set-store + one pub/sub
// bus, so two service/controller instances behave like two separate workers.
class FakeRedis {
  private static sets = new Map<string, Set<string>>();
  private static buses = new Map<string, Set<(msg: string) => void>>();
  static reset() {
    FakeRedis.sets.clear();
    FakeRedis.buses.clear();
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    let s = FakeRedis.sets.get(key);
    if (!s) {
      s = new Set();
      FakeRedis.sets.set(key, s);
    }
    members.forEach((m) => s!.add(m));
  }
  async srem(key: string, ...members: string[]): Promise<void> {
    const s = FakeRedis.sets.get(key);
    members.forEach((m) => s?.delete(m));
  }
  async smembers(key: string): Promise<string[]> {
    return [...(FakeRedis.sets.get(key) ?? [])];
  }
  async sismember(key: string, member: string): Promise<boolean> {
    return FakeRedis.sets.get(key)?.has(member) ?? false;
  }
  async del(key: string): Promise<void> {
    FakeRedis.sets.delete(key);
  }
  async publish(channel: string, message: string): Promise<void> {
    FakeRedis.buses.get(channel)?.forEach((h) => h(message));
  }
  async subscribe(channel: string, handler: (msg: string) => void): Promise<void> {
    let subs = FakeRedis.buses.get(channel);
    if (!subs) {
      subs = new Set();
      FakeRedis.buses.set(channel, subs);
    }
    subs.add(handler);
  }
}

// Minimal BanRepository double: rows double as the DB both workers share.
function makeRepo(rows: any[] = []) {
  return {
    rows,
    async find() {
      return rows.filter((r) => r.is_active !== false);
    },
    async create(dto: any) {
      const row = { ...dto, is_active: true };
      rows.push(row);
      return row;
    },
    async updateMany(q: any, u: any) {
      let n = 0;
      rows.forEach((r) => {
        if (r.value === q.value && r.is_active !== false) {
          Object.assign(r, u.$set);
          n++;
        }
      });
      return { modifiedCount: n };
    },
    async findOne(q: any) {
      return rows.find((r) => r.value === q.value) ?? null;
    },
  };
}

describe('14.13 bans + SSE via Redis', () => {
  beforeEach(() => FakeRedis.reset());

  it('shares bans across workers via the Redis set (ban + unban)', async () => {
    const repo = makeRepo();
    const workerA = new BansService(repo as any, new FakeRedis() as any);
    const workerB = new BansService(repo as any, new FakeRedis() as any);
    await workerA.onModuleInit();
    await workerB.onModuleInit();

    // B starts empty and never touches the DB afterwards — everything it
    // learns must come through Redis.
    expect(await workerB.isBannedAsync('ip', '1.2.3.4')).toBe(false);

    await workerA.ban('admin-1', 'ip', '1.2.3.4', 'spam');
    // Negative entries are short-TTL by design: simulate TTL expiry so the
    // read-through revalidates against the shared set.
    (workerB as any).negativeCache.clear();
    expect(await workerB.isBannedAsync('ip', '1.2.3.4')).toBe(true);
    expect(workerB.isBanned('ip', '1.2.3.4')).toBe(true);

    await workerA.unban('1.2.3.4');
    expect(await workerB.isBannedAsync('ip', '1.2.3.4')).toBe(false);
    expect(workerB.isBanned('ip', '1.2.3.4')).toBe(false);
  });

  it('seeds the local cache from Redis on boot when available', async () => {
    const repo = makeRepo();
    const workerA = new BansService(repo as any, new FakeRedis() as any);
    await workerA.onModuleInit();
    await workerA.ban('admin-1', 'device', 'dev-9');

    // Fresh worker, empty DB view: boot must pick the ban up from Redis.
    const late = new BansService(makeRepo() as any, new FakeRedis() as any);
    await late.onModuleInit();
    expect(late.isBanned('device', 'dev-9')).toBe(true);
  });

  it('fans SSE events out to a sibling worker with the event shape intact', async () => {
    const workerA = new NotificationSseController(new FakeRedis() as any);
    const workerB = new NotificationSseController(new FakeRedis() as any);
    await workerA.onModuleInit();
    await workerB.onModuleInit();

    const received: any[] = [];
    workerB.stream({ id: 'user-1' } as any).subscribe((e) => received.push(e));

    workerA.emit('user-1', { type: 'ping', data: { n: 1 }, id: 'e1' });

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('ping');
    expect(received[0].id).toBe('e1');
    expect(received[0].retry).toBe(3000);
    expect(JSON.parse(received[0].data)).toEqual({ n: 1 });
  });

  it('falls back to local-only when Redis is absent', async () => {
    const bans = new BansService(makeRepo() as any);
    await bans.onModuleInit();
    await bans.ban('admin-1', 'ip', '9.9.9.9');
    expect(bans.isBanned('ip', '9.9.9.9')).toBe(true);
    expect(await bans.isBannedAsync('ip', '9.9.9.9')).toBe(true);
    await bans.unban('9.9.9.9');
    expect(bans.isBanned('ip', '9.9.9.9')).toBe(false);

    const sse = new NotificationSseController();
    await sse.onModuleInit();
    const got: any[] = [];
    sse.stream({ id: 'u9' } as any).subscribe((e) => got.push(e));
    sse.emit('u9', { type: 't', data: { ok: true }, id: 'x' });
    expect(got.length).toBe(1);
    expect(JSON.parse(got[0].data)).toEqual({ ok: true });
  });
});
