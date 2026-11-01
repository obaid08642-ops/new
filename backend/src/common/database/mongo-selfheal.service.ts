import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, mongo } from 'mongoose';

/**
 * 2026-11-01 outage: mongod restarted (its own memory limit), came back healthy, and nabdah-backend stayed "unhealthy" and answered 504 for about two
 * hours, because nothing restarts a container that is merely unhealthy. This is the in-process safety net: if THIS process cannot use its MongoDB
 * connection for `afterSeconds` while a fresh, independent client reaches the same mongod, the process exits non-zero so the restart policy
 * (`restart: unless-stopped`) brings it back with a clean pool. If mongod itself does not answer, nothing is done: exiting would not help and would
 * turn a database outage into a crash loop.
 *
 *   BACKEND_MONGO_SELFHEAL            '1' / '0'. Default: on in production (NODE_ENV=production), off elsewhere (tests, dev).
 *   BACKEND_MONGO_SELFHEAL_AFTER_SECONDS   default 90
 */
export type SelfHealOutcome = 'ok' | 'waiting' | 'mongod-down' | 'exit';

export function selfHealEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.BACKEND_MONGO_SELFHEAL;
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return env.NODE_ENV === 'production';
}

export function selfHealAfterMs(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.BACKEND_MONGO_SELFHEAL_AFTER_SECONDS);
  return (Number.isFinite(n) && n > 0 ? n : 90) * 1000;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout;
  return Promise.race([p, new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); t.unref?.(); })]).finally(() => clearTimeout(t!)) as Promise<T>;
}

@Injectable()
export class MongoSelfHealService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(MongoSelfHealService.name);
  private timer: NodeJS.Timeout | null = null;
  private downSince: number | null = null;
  /** Replaceable in tests: how the process leaves, and how an independent client is made. */
  exit: (code: number) => void = (code) => process.exit(code);
  probe: () => Promise<boolean> = () => this.independentPing();

  constructor(@InjectConnection() private readonly conn: Connection) {}

  onApplicationBootstrap() {
    if (!selfHealEnabled()) return;
    this.timer = setInterval(() => { void this.tick(); }, 10_000);
    this.timer.unref?.();
    this.log.log(`mongo self-heal on: the process restarts itself if its connection is unusable for ${selfHealAfterMs() / 1000} s while mongod answers`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Can THIS process use its connection right now? readyState alone is not enough: a wedged pool still says 1. */
  async usable(): Promise<boolean> {
    if (this.conn.readyState !== 1) return false;
    try {
      await withTimeout(this.conn.db!.admin().ping(), 3_000);
      return true;
    } catch {
      return false;
    }
  }

  /** A brand-new client, its own pool, the same URI: does mongod answer at all? */
  private async independentPing(): Promise<boolean> {
    const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const client = new mongo.MongoClient(uri, { serverSelectionTimeoutMS: 3_000, connectTimeoutMS: 3_000, maxPoolSize: 1 });
    try {
      await withTimeout(client.connect(), 5_000);
      await withTimeout(client.db('admin').command({ ping: 1 }), 3_000);
      return true;
    } catch {
      return false;
    } finally {
      void client.close().catch(() => null);
    }
  }

  async tick(now: number = Date.now()): Promise<SelfHealOutcome> {
    if (await this.usable()) {
      if (this.downSince !== null) this.log.log('mongo connection usable again');
      this.downSince = null;
      return 'ok';
    }
    if (this.downSince === null) { this.downSince = now; this.log.warn('mongo connection not usable; waiting'); }
    if (now - this.downSince < selfHealAfterMs()) return 'waiting';
    if (!(await this.probe())) return 'mongod-down';
    this.log.error(`mongo connection unusable for ${Math.round((now - this.downSince) / 1000)} s while mongod answers: exiting so the restart policy brings this process back`);
    this.exit(1);
    return 'exit';
  }
}
