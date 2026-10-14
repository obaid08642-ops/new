import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../modules/redis/redis.service';

export const WORKER_HEARTBEAT_KEY = 'nabd:worker:heartbeat';
const EVERY_MS = 30_000;

/**
 * P14.26: the worker role says it is alive, so an API process (and the admin health widget) can tell when no
 * process runs cron jobs and queue consumers: without it notifications, reminders and the search sync stop silently.
 * Registered only where background work runs (backgroundProviders).
 */
@Injectable()
export class WorkerHeartbeatService {
  private readonly log = new Logger('WorkerHeartbeat');
  constructor(private readonly redis: RedisService) {}

  async onApplicationBootstrap() {
    await this.beat();
  }

  @Interval(EVERY_MS)
  async beat() {
    await this.redis
      .set(WORKER_HEARTBEAT_KEY, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), (EVERY_MS * 3) / 1000)
      .catch((e: Error) => this.log.warn(`heartbeat not written: ${e.message}`));
  }
}
